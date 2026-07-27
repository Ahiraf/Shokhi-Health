import { getBackend } from "@/lib/server/gemma";
import { detectCriticalLab } from "@/lib/server/personal";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { errorJson, readLanguage } from "@/lib/server/request";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Let multimodal Gemma read and explain the report photo over SSE.
function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  let image: File | null = null;
  let lang: "bn" | "en" = "bn";
  let mode: "standard" | "specialist" = "standard";
  try {
    const form = await req.formData();
    image = form.get("image") as File | null;
    lang = readLanguage(form.get("lang"));
    mode = form.get("mode") === "specialist" ? "specialist" : "standard";
  } catch {
    return errorJson("Expected multipart form data with an 'image' field.", 400);
  }
  if (!image || image.size === 0) return errorJson("No image provided.", 400);
  if (!image.type.startsWith("image/")) return errorJson("File must be an image.", 400);
  if (image.size > 12 * 1024 * 1024) return errorJson("Image too large (max 12 MB).", 413);

  const bytes = await image.arrayBuffer();
  const mime = image.type;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, d: unknown) => controller.enqueue(encoder.encode(sse(event, d)));
      controller.enqueue(encoder.encode(": open\n\n"));
      try {
        const analysis = await getBackend().analyzeReportImage(bytes, mime, lang, mode);
        send("meta", { critical: detectCriticalLab(analysis) });
        for (const chunk of analysis.match(/[^\n]+\n?|\n/g) ?? [analysis]) send("delta", chunk);
        send("done", {});
      } catch {
        send("error", { detail: "Couldn't read that image. Please try a clearer photo, or type the values." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
