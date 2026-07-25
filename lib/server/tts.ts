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

function pcmToWav(pcm: Buffer, sampleRate = 24_000, channels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  header.writeUInt16LE(channels * bitsPerSample / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Gemini TTS supplies natural female speech; browser speech remains the offline fallback. */
export async function synthesize(text: string, lang: "bn" | "en"): Promise<Buffer> {
  const keys = geminiKeys();
  if (!keys.length) throw new Error("No TTS API key configured.");

  const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
  const body = JSON.stringify({
    contents: [{ parts: [{ text: `${lang === "bn" ? "Speak naturally in Bangla from Bangladesh" : "Speak naturally in English"}: ${cleanText(text)}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
    },
  });

  let lastError: unknown;
  for (const key of keys) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result = await response.json() as any;
      const audio = result?.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData?.data;
      if (!response.ok || !audio) throw new Error(result?.error?.message || `TTS request failed: ${response.status}`);
      return pcmToWav(Buffer.from(audio, "base64"));
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`TTS unavailable: ${lastError}`);
}
