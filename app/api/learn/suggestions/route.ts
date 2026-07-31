import { NextResponse } from "next/server";
import { Assistant } from "@/lib/server/assistant";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { errorJson, MAX_TOPIC_LENGTH, readJson, readLanguage, readText } from "@/lib/server/request";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: Request) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;
  const body = await readJson(req);
  if (!body) return errorJson("Request body must be a JSON object.", 400);
  const query = readText(body, "query", MAX_TOPIC_LENGTH, true);
  if (!query) return errorJson("Query is required.", 400);
  try {
    const suggestions = await new Assistant().suggestLearnTopics(query, readLanguage(body.lang));
    return NextResponse.json({ suggestions });
  } catch {
    return errorJson("Search suggestions are temporarily unavailable.", 503);
  }
}
