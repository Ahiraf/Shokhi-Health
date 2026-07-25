// High-quality read-aloud with Google's neural TTS (Gemini TTS), using the same GOOGLE_API_KEY
// as the rest of the app. The browser's built-in SpeechSynthesis is device-dependent, so the
// server voice is the primary path and the browser remains an offline fallback.

import { geminiKeys } from "./gemma";

const TTS_MODEL = process.env.SHOKHI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
// Achird is friendly and conversational; override it when testing another supported voice.
const VOICE = process.env.SHOKHI_TTS_VOICE || "Achird";

function cleanTranscript(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\*_#>`~]/g, "")
    .replace(/[•▪◦·]/g, " ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function promptFor(text: string, lang: "bn" | "en"): string {
  const transcript = cleanTranscript(text).slice(0, 1500);
  if (lang === "bn") {
    return [
      "Audio profile: a warm, natural adult woman from Bangladesh who is a native Bangla speaker.",
      "Scene: she is speaking directly and kindly to a woman who may not be able to read.",
      "Director's notes: use natural Bangladeshi Bengali pronunciation (bn-BD), not an English or Indian Bengali accent. Speak conversationally, clearly, gently, and unhurriedly, with short natural pauses. Sound human and reassuring, not like a navigation system or a newsreader. Do not translate, summarize, or add words.",
      `Transcript: ${transcript}`,
    ].join("\n");
  }
  return [
    "Audio profile: a warm, natural adult woman speaking clearly and kindly.",
    "Director's notes: conversational pace, gentle pauses, reassuring tone, never robotic or like a navigation system. Do not translate, summarize, or add words.",
    `Transcript: ${transcript}`,
  ].join("\n");
}

/** Wrap raw signed-16-bit little-endian PCM in a minimal WAV header so browsers can play it. */
function wav(pcm: Buffer, sampleRate: number, channels = 1, bits = 16): Buffer {
  const byteRate = (sampleRate * channels * bits) / 8;
  const blockAlign = (channels * bits) / 8;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(bits, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Synthesize `text` to a WAV buffer with Google's neural TTS, rotating keys on error. */
export async function synthesize(text: string, lang: "bn" | "en"): Promise<Buffer> {
  const keys = geminiKeys();
  if (!keys.length) throw new Error("No GOOGLE_API_KEY for TTS.");
  const { GoogleGenAI } = await import("@google/genai");

  const prompt = promptFor(text, lang);

  let lastErr: unknown;
  for (const key of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const resp: any = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: prompt,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      });
      const inline = resp?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inline?.data) throw new Error("Empty audio response.");
      const rate = parseInt((inline.mimeType?.match(/rate=(\d+)/) || [])[1] || "24000", 10);
      const pcm = Buffer.from(inline.data, "base64");
      return wav(pcm, rate);
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  throw new Error(`TTS failed: ${lastErr}`);
}
