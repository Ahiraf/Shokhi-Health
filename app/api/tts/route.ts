import { NextResponse } from "next/server";
import { synthesize } from "@/lib/server/tts";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { errorJson, readJson, readLanguage, readText, MAX_MESSAGE_LENGTH } from "@/lib/server/request";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;
  const body = await readJson(req);
  if (!body) return errorJson("Request body must be a JSON object.", 400);
  const text = readText(body, "text", MAX_MESSAGE_LENGTH, true);
  if (!text) return errorJson("Text is required.", 400);

  try {
    const audio = await synthesize(text, readLanguage(body.lang));
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.length),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[tts]", error instanceof Error ? error.message : String(error));
    return errorJson("TTS unavailable.", 503);
  }
}
