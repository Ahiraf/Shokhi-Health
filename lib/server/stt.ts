import { geminiKeys, withGeminiKeyFallback } from "./gemma";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/**
 * Server transcription is deliberately limited to a user-configured local ASR service.
 * The normal browser path uses the device's native SpeechRecognition API. We do not call
 * another hosted foundation model for speech, keeping Gemma 4 as the only LLM in the app.
 */
export async function transcribeAudio(
  audio: Buffer,
  mimeType: string,
  lang: "bn" | "en",
): Promise<string> {
  if (audio.length === 0 || audio.length > MAX_AUDIO_BYTES) throw new Error("Audio is too large.");
  const localUrl = process.env.SHOKHI_LOCAL_ASR_URL;
  if (process.env.SHOKHI_BACKEND === "local" && localUrl) {
    const response = await fetch(localUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_base64: audio.toString("base64"), mime_type: mimeType, language: lang }),
    });
    const data = await response.json().catch(() => ({})) as any;
    const transcript = typeof data?.transcript === "string" ? data.transcript.trim() : "";
    if (!response.ok || !transcript) throw new Error(data?.error || `Local ASR failed: ${response.status}`);
    return transcript.slice(0, 2_000);
  }

  // Hosted mode uses the configured Google key for speech-to-text as well. Gemma 4
  // remains the conversation model; Gemini's audio-capable model is only used to
  // turn the short recording into text before the normal safety-first pipeline runs.
  if (geminiKeys().length) {
    const model = process.env.SHOKHI_STT_MODEL || "gemini-2.5-flash";
    const transcript = await withGeminiKeyFallback(async (key) => {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey: key });
      const response: any = await client.models.generateContent({
        model,
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType, data: audio.toString("base64") } },
            {
              text: lang === "bn"
                ? "এই অডিওতে বলা কথাগুলো হুবহু বাংলায় লিখুন। কোনো ব্যাখ্যা, অনুবাদ বা অতিরিক্ত লেখা দেবেন না। স্পষ্ট কথা না শোনা গেলে খালি উত্তর দিন।"
                : "Transcribe the spoken words exactly in English. Do not explain, translate, or add anything. Return an empty answer if no clear speech is present.",
            },
          ],
        }],
        config: { temperature: 0, maxOutputTokens: 500 },
      });
      return typeof response?.text === "string" ? response.text.trim() : "";
    });
    if (transcript) return transcript.slice(0, 2_000);
    throw new Error("No speech was detected.");
  }

  throw new Error(lang === "en"
    ? "Browser speech recognition or a configured speech service is required for voice input."
    : "ভয়েস ইনপুটের জন্য ব্রাউজারের স্পিচ রিকগনিশন বা কনফিগার করা স্পিচ সার্ভিস দরকার।");
}

export { MAX_AUDIO_BYTES };
