// High-quality read-aloud with GOOGLE's neural TTS (Gemini TTS), using the same GOOGLE_API_KEY
// as the rest of the app — NO OpenAI. The browser's built-in SpeechSynthesis is device-dependent
// and for Bangla often sounds robotic/"trembling"; this synthesizes a fluent, correctly-pronounced
// voice server-side. The client uses it and falls back to the browser voice if it's unavailable.

import { geminiKeys } from "./gemma";

const TTS_MODEL = process.env.SHOKHI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
// warm, gentle female voices; Kore = calm, Aoede = bright. Configurable.
const VOICE = process.env.SHOKHI_TTS_VOICE || "Kore";

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

  const style = lang === "bn" ? "শান্ত, যত্নশীল ও স্পষ্ট কণ্ঠে ধীরে ধীরে বলুন: " : "Say this warmly, clearly and calmly: ";
  const prompt = style + text.slice(0, 1500);

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
