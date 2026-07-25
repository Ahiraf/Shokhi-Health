import { NextResponse } from "next/server";
import { synthesize } from "@/lib/server/tts";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { errorJson, readJson, readLanguage, readText, MAX_MESSAGE_LENGTH } from "@/lib/server/request";

export const runtime = "nodejs";
export const maxDuration = 30;

// Neural read-aloud (Google TTS). Returns a WAV clip the client plays. Falls back to the
// browser voice on the client if this is unavailable.
export async function POST(req: Request) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;
  const body = await readJson(req);
  if (!body) return errorJson("Request body must be a JSON object.", 400);
  const text = readText(body, "text", MAX_MESSAGE_LENGTH, true);
  if (!text) return errorJson("Text is required.", 400);
  const lang = readLanguage(body.lang);

  try {
    const wav = await synthesize(text, lang);
    return new NextResponse(wav, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[tts]", err instanceof Error ? err.message : String(err));
    return errorJson("TTS unavailable.", 503);
  }
}
