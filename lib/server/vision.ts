// Read a PHOTO of a medical report and explain it in simple language — for women who can't read
// or understand medical terms. Uses GOOGLE's multimodal model (same GOOGLE_API_KEY, no OpenAI).
// This is an INPUT/OCR-and-explain step; it stays general info and always defers to a doctor.

import { geminiKeys } from "./gemma";

function models(): string[] {
  const pref = process.env.SHOKHI_VISION_MODEL;
  return Array.from(new Set([pref, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter(Boolean) as string[]));
}

function normalizeMime(m: string): string {
  const base = (m || "image/jpeg").split(";")[0].trim().toLowerCase();
  return ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"].includes(base)
    ? (base === "image/jpg" ? "image/jpeg" : base)
    : "image/jpeg";
}

/** Stream a simple, caring explanation of a report image in the chosen language. */
export async function* explainReportImageStream(bytes: ArrayBuffer, mime: string, lang: "bn" | "en"): AsyncGenerator<string> {
  const keys = geminiKeys();
  if (!keys.length) throw new Error("No GOOGLE_API_KEY for report reading.");
  const data = Buffer.from(bytes).toString("base64");
  const m = normalizeMime(mime);
  const { GoogleGenAI } = await import("@google/genai");

  const langName = lang === "en" ? "English" : "Bangla";
  const prompt =
    "You are Shokhi (সখী), a warm, respectful Bangla-first women's health companion. A woman has " +
    "shared a PHOTO of her medical test report. Read the values in the image and explain them in " +
    `very simple, spoken-style ${langName} for someone who may have little schooling and does not ` +
    "understand medical terms. For each value, say in plain words what it is, whether it looks low, " +
    "normal or high, and what that generally means for her daily life. If anything looks seriously " +
    "abnormal, clearly tell her to see a doctor soon. This is GENERAL information, not a diagnosis — " +
    "always tell her to confirm with a doctor. Never give medicine names or doses. Do not read out " +
    `long ID numbers. Write the whole answer in ${langName}.`;

  let lastErr: unknown;
  for (const model of models()) {
    for (const key of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const stream: any = await ai.models.generateContentStream({
          model,
          contents: [{ text: prompt }, { inlineData: { mimeType: m, data } }],
          config: { temperature: 0.3 },
        });
        for await (const chunk of stream) {
          const t = chunk?.text ?? "";
          if (t) yield t;
        }
        return;
      } catch (err) {
        lastErr = err;
        continue;
      }
    }
  }
  throw new Error(`Report reading unavailable: ${lastErr}`);
}
