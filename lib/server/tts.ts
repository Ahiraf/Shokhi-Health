import { geminiKeys } from "./gemma";

function cleanText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\*_#>`~]/g, "")
    .replace(/[•▪◦·]/g, " ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1400);
}

/** Standard Google Cloud TTS, not a language model. Female neural voices are preferred. */
export async function synthesize(text: string, lang: "bn" | "en"): Promise<Buffer> {
  const keys = Array.from(new Set([
    process.env.GOOGLE_CLOUD_TTS_API_KEY,
    ...geminiKeys(),
  ].filter(Boolean) as string[]));
  if (!keys.length) throw new Error("No TTS API key configured.");

  const languageCode = lang === "bn" ? "bn-IN" : "en-US";
  const voiceName = lang === "bn" ? "bn-IN-Wavenet-A" : "en-US-Neural2-F";
  const body = JSON.stringify({
    input: { text: cleanText(text) },
    voice: { languageCode, name: voiceName },
    audioConfig: { audioEncoding: "MP3", speakingRate: lang === "bn" ? 0.9 : 0.95, pitch: 0.5 },
  });

  let lastError: unknown;
  for (const key of keys) {
    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result = await response.json() as any;
      if (!response.ok || !result.audioContent) throw new Error(result?.error?.message || `TTS request failed: ${response.status}`);
      return Buffer.from(result.audioContent, "base64");
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`TTS unavailable: ${lastError}`);
}
