import type {
  MessageResponse,
  GuideCard,
  GuideResponse,
  GuideFull,
  KnowledgeResponse,
  CycleLog,
  CycleAnalysis,
  Wellness,
} from "./types";
import type { PersonalizationContext } from "./personalization";

// The backend now lives in this same Next.js app (app/api/*), so calls are same-origin
// (relative). NEXT_PUBLIC_API_URL is only needed if you point at an external backend.
const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export function sendMessage(
  message: string,
  profile: Record<string, unknown>,
  history: string[],
  lang: "bn" | "en" = "bn",
  personalization: PersonalizationContext = {},
): Promise<MessageResponse> {
  return post<MessageResponse>("/api/message", { message, profile, history, lang, personalization });
}

/** Voice Bridge: upload audio and receive transcript + the normal safety-first reply. */
export async function voiceBridge(
  file: Blob,
  lang: "bn" | "en",
  profile: Record<string, unknown>,
  history: string[],
  personalization: PersonalizationContext = {},
): Promise<MessageResponse & { transcript: string }> {
  const form = new FormData();
  form.append("audio", file, "voice.webm");
  form.append("lang", lang);
  form.append("profile", JSON.stringify(profile));
  form.append("history", JSON.stringify(history));
  form.append("personalization", JSON.stringify(personalization));
  const res = await fetch(`${BASE}/api/voice/bridge`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.detail || `voice bridge failed: ${res.status}`);
  return data;
}

/**
 * Streaming chat over Server-Sent Events. Calls `onMeta` once with the triage/profile
 * payload, then `onDelta` for each guidance chunk. Resolves with the assembled full text.
 * Throws on transport failure before the stream starts so the caller can fall back to sendMessage().
 */
export async function sendMessageStream(
  message: string,
  profile: Record<string, unknown>,
  history: string[],
  lang: "bn" | "en",
  personalization: PersonalizationContext = {},
  handlers: { onMeta?: (m: Omit<MessageResponse, "guidance">) => void; onDelta?: (text: string) => void }
): Promise<string> {
  const res = await fetch(`${BASE}/api/message/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, profile, history, lang, personalization }),
  });
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let sawMeta = false;
  let sawDone = false;

  const handleEvent = (block: string) => {
    const lines = block.split("\n");
    const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
    const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
    if (!event || dataLine === undefined) return;
    const data = JSON.parse(dataLine);
    if (event === "meta") { sawMeta = true; handlers.onMeta?.(data); }
    else if (event === "delta") { full += data; handlers.onDelta?.(data as string); }
    else if (event === "done") sawDone = true;
    else if (event === "error") throw new Error(data.detail || "stream error");
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (block.trim()) handleEvent(block);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) handleEvent(buffer.trim());
  if (!sawMeta || !sawDone) throw new Error("stream ended before completion");
  return full;
}

/**
 * Stream an on-demand personalised Gemma feature (today note, cycle explanation, report
 * explainer, mood reflection, family note) over SSE. Calls `onDelta` for each chunk and
 * resolves with the full text. Throws on transport failure.
 */
export async function composeStream(
  kind: "today" | "cycle" | "report" | "mood" | "family" | "weekly",
  data: Record<string, unknown>,
  lang: "bn" | "en",
  onDelta: (chunk: string) => void
): Promise<string> {
  const res = await fetch(`${BASE}/api/compose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, data, lang }),
  });
  if (!res.ok || !res.body) throw new Error(`compose failed: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const lines = block.split("\n");
      const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
      const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
      if (!event || dataLine === undefined) continue;
      const parsed = JSON.parse(dataLine);
      if (event === "delta") { full += parsed; onDelta(parsed as string); }
      else if (event === "error") throw new Error(parsed.detail || "compose error");
    }
  }
  return full;
}

/** Send a REPORT IMAGE to multimodal Gemma and stream its explanation. */
export async function reportImageStream(
  file: File,
  lang: "bn" | "en",
  onDelta: (chunk: string) => void,
  mode: "standard" | "specialist" = "standard",
  onMeta?: (meta: { critical?: { level: "urgent" | "low" | null; note_bn: string; note_en: string } }) => void,
): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  form.append("lang", lang);
  form.append("mode", mode);
  const res = await fetch(`${BASE}/api/report-image`, { method: "POST", body: form });
  if (!res.ok || !res.body) throw new Error(`report-image failed: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const lines = block.split("\n");
      const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
      const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
      if (!event || dataLine === undefined) continue;
      const parsed = JSON.parse(dataLine);
      if (event === "meta") onMeta?.(parsed);
      else if (event === "delta") { full += parsed; onDelta(parsed as string); }
      else if (event === "error") throw new Error(parsed.detail || "report-image error");
    }
  }
  return full;
}

export async function getGuides(): Promise<GuideCard[]> {
  const res = await fetch(`${BASE}/api/guides`);
  if (!res.ok) throw new Error("guides failed");
  const data = (await res.json()) as { guides: GuideCard[] };
  return data.guides;
}

export function explainGuide(topic: string, lang: "bn" | "en" = "bn", profile: Record<string, unknown> = {}, personalization: PersonalizationContext = {}): Promise<GuideResponse> {
  return post<GuideResponse>("/api/guide", { topic, lang, profile, personalization });
}

export async function getGuide(id: string): Promise<GuideFull> {
  const res = await fetch(`${BASE}/api/guides/${id}`);
  if (!res.ok) throw new Error("guide failed");
  return res.json();
}

export async function getKnowledge(): Promise<KnowledgeResponse> {
  const res = await fetch(`${BASE}/api/knowledge`);
  if (!res.ok) throw new Error("knowledge failed");
  return res.json();
}

export async function getWellness(): Promise<Wellness> {
  const res = await fetch(`${BASE}/api/wellness`);
  if (!res.ok) throw new Error("wellness failed");
  return res.json();
}

export async function bustMyth(belief: string, lang: "bn" | "en" = "bn"): Promise<string> {
  const data = await post<{ reply: string }>("/api/myth", { belief, lang });
  return data.reply;
}

export function analyzeCycle(logs: CycleLog[], lang: "bn" | "en" = "bn"): Promise<CycleAnalysis> {
  return post<CycleAnalysis>("/api/cycle/analyze", { logs, lang });
}

export async function health(): Promise<{ status: string; backend: string }> {
  const res = await fetch(`${BASE}/api/health`);
  return res.json();
}
