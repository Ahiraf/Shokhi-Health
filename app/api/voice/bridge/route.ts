import { NextResponse } from "next/server";
import { Assistant, applySafetyNet, safetyNetEnabled } from "@/lib/server/assistant";
import { detectCrisis, crisisResponse } from "@/lib/server/crisis";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { MAX_MESSAGE_LENGTH, errorJson, readHistory, readLanguage, readPersonalization, readProfile } from "@/lib/server/request";
import { MAX_AUDIO_BYTES, transcribeAudio } from "@/lib/server/stt";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_AUDIO = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"]);

/** One-turn voice path: audio → transcript → the same safety-first triage as chat. */
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
    const lang = readLanguage(form.get("lang"));
    const transcript = (await transcribeAudio(Buffer.from(await file.arrayBuffer()), mimeType, lang)).slice(0, MAX_MESSAGE_LENGTH);
    if (!transcript) return errorJson("No speech was detected.", 422);
    const profile = readProfile(JSON.parse(String(form.get("profile") || "{}")));
    const history = readHistory(JSON.parse(String(form.get("history") || "[]")));
    const personalization = readPersonalization(JSON.parse(String(form.get("personalization") || "{}")));

    if (detectCrisis(transcript)) {
      return NextResponse.json({ transcript, profile, extraction: null, triage: null, guidance: crisisResponse(lang), next_question: null, is_emergency: true, backend: "crisis" });
    }

    const assistant = new Assistant(profile, history, personalization);
    const safetyP = safetyNetEnabled()
      ? assistant.backend.safetyCheck(transcript).catch(() => ({ emergency: false, reason: null }))
      : Promise.resolve({ emergency: false, reason: null });
    await assistant.addUserMessage(transcript);
    const { result } = applySafetyNet(assistant.triage(), await safetyP);
    return NextResponse.json({
      transcript,
      profile: assistant.profile,
      extraction: assistant.extraction,
      triage: result,
      guidance: await assistant.backend.explainTriage(result, lang, assistant.personalization),
      next_question: assistant.nextQuestion(),
      is_emergency: result.urgency === "emergency",
      backend: assistant.backend.name,
    });
  } catch (error) {
    console.error("[voice-bridge]", error instanceof Error ? error.message : String(error));
    return errorJson("Voice help is temporarily unavailable. Please type your message or try again.", 503);
  }
}
