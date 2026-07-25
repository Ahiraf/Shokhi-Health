import { getBackend } from "@/lib/server/gemma";
import { buildPersonal, type PersonalKind } from "@/lib/server/personal";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { errorJson, readJson, readLanguage } from "@/lib/server/request";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// One streaming endpoint for all on-demand Gemma personalisation features (today note, cycle
// explanation, report explainer, mood reflection, family note). SSE like the chat: opens
// immediately, streams the text, and gracefully falls back to a deterministic note with no key.
function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const KINDS = new Set<PersonalKind>(["today", "cycle", "report", "mood", "family"]);

export async function POST(req: Request) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;
  const body = await readJson(req);
  if (!body) return errorJson("Request body must be a JSON object.", 400);
  const kind = body.kind as PersonalKind;
  if (!KINDS.has(kind)) return errorJson("Unknown kind.", 400);
  const lang = readLanguage(body.lang);
  const data = (body.data && typeof body.data === "object") ? body.data : {};

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, d: unknown) => controller.enqueue(encoder.encode(sse(event, d)));
      controller.enqueue(encoder.encode(": open\n\n"));
      try {
        const { system, user, fallback } = buildPersonal(kind, data, lang);
        const backend = getBackend();
        for await (const chunk of backend.composeStream(system, user, lang, fallback)) {
          send("delta", chunk);
        }
        send("done", {});
      } catch {
        send("error", { detail: "Shokhi couldn't write that just now. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
