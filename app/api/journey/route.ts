import { NextResponse } from "next/server";
import { Assistant } from "@/lib/server/assistant";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { errorJson, readJson, readLanguage, readText, MAX_MESSAGE_LENGTH } from "@/lib/server/request";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;
  const body = await readJson(req);
  if (!body) return errorJson("Request body must be a JSON object.", 400);
  const message = readText(body, "message", MAX_MESSAGE_LENGTH, true);
  if (!message) return errorJson("Message is required.", 400);
  try {
    const result = await new Assistant().classifyJourney(message, readLanguage(body.lang));
    return NextResponse.json(result);
  } catch {
    return errorJson("Journey matching is temporarily unavailable.", 503);
  }
}
