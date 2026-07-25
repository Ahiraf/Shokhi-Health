import { geminiKeys } from "./gemma";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function isRetryable(message: string): boolean {
  const value = message.toLowerCase();
  return ["429", "quota", "resource_exhausted", "rate limit", "503", "overloaded", "500", "internal server error", "401", "403", "invalid api key"]
    .some((part) => value.includes(part));
}

/** Gemini is used here only as speech-to-text; the transcript goes through the normal Advice flow. */
export async function transcribeAudio(
  audio: Buffer,
  mimeType: string,
  lang: "bn" | "en",
): Promise<string> {
  if (audio.length === 0 || audio.length > MAX_AUDIO_BYTES) throw new Error("Audio is too large.");
  const keys = geminiKeys();
  if (!keys.length) throw new Error("No Gemini API key configured.");

  const model = process.env.SHOKHI_STT_MODEL || "gemini-2.5-flash";
  const prompt = lang === "bn"
    ? "Transcribe only the woman's spoken words into Bangla. Preserve the meaning and do not add commentary, advice, labels, or punctuation that was not needed. Return only the transcript."
    : "Transcribe only the speaker's spoken words into English. Preserve the meaning and do not add commentary, advice, labels, or punctuation that was not needed. Return only the transcript.";
  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: audio.toString("base64") } },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 500 },
  });

  let lastError: unknown;
  for (const key of keys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body },
      );
      const result = await response.json() as any;
      const transcript = result?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || "")
        .join("")
        .trim();
      if (!response.ok || !transcript) {
        throw new Error(result?.error?.message || `STT request failed: ${response.status}`);
      }
      return transcript.slice(0, 2_000);
    } catch (error) {
      lastError = error;
      if (!isRetryable(String((error as any)?.message ?? error))) throw error;
    }
  }
  throw new Error(`STT unavailable: ${lastError}`);
}

export { MAX_AUDIO_BYTES };
