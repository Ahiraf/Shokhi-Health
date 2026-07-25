import { geminiKeys } from "./gemma";

function normalizeMime(mime: string): string {
  const base = (mime || "image/jpeg").split(";")[0].trim().toLowerCase();
  return base === "image/jpg" ? "image/jpeg" : base;
}

/** Extract report text with Google Cloud Vision OCR; this endpoint does not generate text. */
export async function extractReportText(bytes: ArrayBuffer, mime: string): Promise<string> {
  const keys = Array.from(new Set([
    process.env.GOOGLE_CLOUD_VISION_API_KEY,
    ...geminiKeys(),
  ].filter(Boolean) as string[]));
  if (!keys.length) throw new Error("No OCR API key configured.");

  const body = JSON.stringify({
    requests: [{
      image: { content: Buffer.from(bytes).toString("base64") },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      imageContext: { languageHints: ["bn", "en"] },
    }],
  });
  let lastError: unknown;
  for (const key of keys) {
    try {
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!response.ok) throw new Error(`OCR request failed: ${response.status}`);
      const result = await response.json() as any;
      const error = result?.responses?.[0]?.error?.message;
      if (error) throw new Error(error);
      const text = String(result?.responses?.[0]?.fullTextAnnotation?.text || "").trim();
      if (!text) throw new Error("No readable text found.");
      return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`OCR unavailable: ${lastError}`);
}
