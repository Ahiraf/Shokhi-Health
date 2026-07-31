// Build the RAG corpus: read lib/server/rag/sources/*.md, chunk each document, embed
// every chunk, and write lib/server/rag/corpus.json.  Run with:  npm run ingest
//
// Embedder is chosen automatically: Google gemini-embedding-2 if GOOGLE_API_KEY is set,
// otherwise the offline mock embedder (so a fresh clone works with no key). Re-run this
// (with the key set) and commit corpus.json to get real semantic retrieval on Vercel.
//
// 100% TypeScript — no Python anywhere in the pipeline.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvConfig } from "@next/env";
import {
  embedMany,
  chunkWithHeadings,
  activeEmbedder,
  EMBED_MODEL,
  BGE_MODEL,
  type Embedder,
} from "../lib/server/rag-embed";

// Load .env.local (the same file the app uses) so GOOGLE_API_KEY is picked up
// automatically — no need to pass it inline on the command.
loadEnvConfig(process.cwd());

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCES_DIR = join(__dirname, "../lib/server/rag/sources");
const OUT = join(__dirname, "../lib/server/rag/corpus.json");

// Extended frontmatter: `topic`, `pub_year` and `page` join the citation metadata so
// every retrieved chunk can be traced (like Maya's source_org / page / section_title).
type Meta = {
  title: string;
  source: string;
  url: string;
  lang: string;
  topic: string;
  pub_year: string;
  page: string;
  audience: string;
  life_stage: string;
  reviewed_at: string;
};

function listMeta(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

/** Parse a very small `--- key: value ---` frontmatter header. */
function parseDoc(raw: string): { meta: Meta; body: string } {
  const m = raw.match(/^---\s*([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  const meta: Meta = { title: "", source: "", url: "", lang: "en", topic: "", pub_year: "", page: "", audience: "", life_stage: "", reviewed_at: "" };
  if (!m) return { meta, body: raw };
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) (meta as any)[kv[1]] = kv[2].trim();
  }
  return { meta, body: m[2] };
}

// Fallback topic inferred from the filename prefix, so existing sources get a sensible
// topic even before a `topic:` line is added to their frontmatter.
function inferTopic(file: string, meta: Meta): string {
  if (meta.topic) return meta.topic;
  const f = file.toLowerCase();
  if (f.includes("pcos")) return "pcos";
  if (f.includes("endometrio")) return "endometriosis";
  if (f.includes("menstrual")) return "menstruation";
  if (f.includes("menopause")) return "menopause";
  if (f.includes("contracept") || f.includes("family_planning") || f.includes("menstrual_regulation")) return "contraception";
  if (f.includes("antenatal") || f.includes("pregnan") || f.includes("maternal") || f.includes("newborn")) return "pregnancy";
  if (f.includes("hiv")) return "infection";
  return "general";
}

async function main() {
  // EMBEDDER=google|bge-m3|mock overrides auto-detection (used by the embedder benchmark).
  const override = process.env.EMBEDDER as Embedder | undefined;
  const embedder: Embedder = override ?? activeEmbedder();
  if (process.env.REQUIRE_SEMANTIC_EMBEDDINGS === "1" && embedder === "mock") {
    throw new Error("Semantic embeddings are required. Set GOOGLE_API_KEY or choose EMBEDDER=google/bge-m3.");
  }
  const modelLabel =
    embedder === "google" ? EMBED_MODEL : embedder === "bge-m3" ? BGE_MODEL : "mock-lexical-256";
  console.log(`[ingest] embedder = ${embedder} (${modelLabel})`);

  const files = readdirSync(SOURCES_DIR).filter((f) => f.endsWith(".md"));
  const chunks: any[] = [];
  let dim = 0;

  // Reuse embeddings for unchanged passages. This keeps refreshes under provider
  // quotas and makes adding a few new sources inexpensive.
  const existingById = new Map<string, any>();
  try {
    const previous = JSON.parse(readFileSync(OUT, "utf-8"));
    for (const chunk of previous.chunks ?? []) existingById.set(chunk.id, chunk);
  } catch {
    // No previous corpus is normal on a fresh clone.
  }

  for (const file of files) {
    const { meta, body } = parseDoc(readFileSync(join(SOURCES_DIR, file), "utf-8"));
    const topic = inferTopic(file, meta);
    const pieces = chunkWithHeadings(body);
    console.log(`[ingest] ${file}: ${pieces.length} chunks (topic=${topic})`);
    const ids = pieces.map((_, i) => `${file.replace(/\.md$/, "")}-${i}`);
    const missing = pieces
      .map(({ text }, i) => ({ i, text }))
      .filter(({ i }) => !existingById.has(ids[i]));
    if (missing.length) console.log(`[ingest] embedding ${missing.length} new passages`);
    const embeddings = await embedMany(missing.map(({ text }) => `${meta.title}\n${text}`), embedder);
    const embeddingByIndex = new Map(missing.map(({ i }, position) => [i, embeddings[position]]));
    for (let i = 0; i < pieces.length; i++) {
      const { text, section } = pieces[i];
      const previous = existingById.get(ids[i]);
      const embedding = previous?.embedding ?? embeddingByIndex.get(i);
      if (!embedding) throw new Error(`Missing embedding for ${ids[i]}`);
      dim = embedding.length;
      chunks.push({
        id: ids[i],
        text,
        title: meta.title,
        source: meta.source,
        url: meta.url,
        section,
        topic,
        pub_year: meta.pub_year || "",
        page: meta.page || "",
        audience: listMeta(meta.audience),
        life_stage: listMeta(meta.life_stage),
        language: meta.lang || "en",
        reviewed_at: meta.reviewed_at || "",
        embedding,
      });
    }
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ embedder, model: modelLabel, dim, chunks }, null, 0));
  console.log(`[ingest] wrote ${chunks.length} chunks (dim ${dim}) -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
