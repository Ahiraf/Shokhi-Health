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
  throw new Error(lang === "en"
    ? "Browser speech recognition or a local ASR service is required for voice input."
    : "ভয়েস ইনপুটের জন্য ব্রাউজারের স্পিচ রিকগনিশন বা স্থানীয় ASR সার্ভিস দরকার।");
}

export { MAX_AUDIO_BYTES };
