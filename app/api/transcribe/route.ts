import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { transcribeAudio, MAX_AUDIO_BYTES } from "@/lib/server/stt";
import { errorJson, readLanguage } from "@/lib/server/request";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_AUDIO = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
  "audio/mpeg",
]);

export async function POST(req: Request) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) return errorJson("Audio is required.", 400);
    const mimeType = file.type.split(";")[0].toLowerCase();
    if (!ALLOWED_AUDIO.has(mimeType)) return errorJson("Unsupported audio format.", 415);
    if (file.size === 0 || file.size > MAX_AUDIO_BYTES) return errorJson("Audio is too large.", 413);

    const transcript = await transcribeAudio(
      Buffer.from(await file.arrayBuffer()),
      mimeType,
      readLanguage(form.get("lang")),
    );
    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("[transcribe]", error instanceof Error ? error.message : String(error));
    return errorJson("Voice transcription is unavailable.", 503);
  }
}
