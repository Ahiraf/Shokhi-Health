// Retrieval layer for Shokhi's RAG feature — 100% TypeScript, no Python.
//
// RAG = Retrieval-Augmented Generation: before Gemma answers, we RETRIEVE the most
// relevant passages from a corpus of trusted, cited health documents and hand them to
// Gemma as context. Embeddings + cosine search are non-generative (rules-allowed);
// Gemma stays the ONLY LLM that generates the answer.
//
// The query is embedded with the SAME embedder the corpus was built with (stored in
// corpus.json) so the vectors are comparable. If a google-embedded corpus is served without
// a key, retrieval falls back to keyword overlap so the feature degrades gracefully.
//
// SCALING: vectors are pre-normalized into a Float32 matrix once at load, so a query is a
// tight dot-product scan (cosine == dot for unit vectors). This is exact and fast for a few
// thousand chunks. The search sits behind the `VectorStore` interface below, so a hosted ANN
// index (Pinecone/Qdrant) or a local one (hnswlib) can be dropped in without touching callers
// once the corpus outgrows an in-memory scan.

import corpusJson from "./rag/corpus.json";
import { embed, type Embedder } from "./rag-embed";
import { expandedSearchTerms, textHasSearchGroup } from "./rag-lexicon";

export type Chunk = {
  id: string;
  text: string;
  title: string;
  source: string;
  url: string;
  section?: string;
  topic?: string;
  pub_year?: string;
  page?: string;
  audience?: string[];
  life_stage?: string[];
  language?: string;
  reviewed_at?: string;
  embedding: number[];
};

type Corpus = { embedder: Embedder; model: string; dim: number; chunks: Chunk[] };

export type Retrieved = {
  text: string;
  title: string;
  source: string;
  url: string;
  section?: string;
  topic?: string;
  pub_year?: string;
  page?: string;
  audience?: string[];
  life_stage?: string[];
  language?: string;
  reviewed_at?: string;
  score: number;
  semantic_score?: number;
  keyword_score?: number;
};

export interface RetrieveOptions {
  /** Minimum cosine similarity to count as grounding (guards against false grounding). */
  minScore?: number;
  /** Topic to gently prefer (e.g. the user's life-stage/triage topic). Ordering only. */
  boostTopic?: string;
  /** Restrict to a topic or list of topics when the caller has a clear intent. */
  topic?: string | string[];
  /** Prefer/filter intended reader groups. General chunks without metadata remain eligible. */
  audience?: string | string[];
  /** Prefer/filter life-stage material. General chunks without metadata remain eligible. */
  lifeStage?: string | string[];
  /** ISO language code; chunks without language metadata remain eligible. */
  language?: string;
  /** Minimum lexical evidence when using a semantic corpus. */
  minKeywordScore?: number;
  /** Maximum number of returned chunks from one source URL. */
  maxPerSource?: number;
}

const corpus = corpusJson as unknown as Corpus;

// --- pre-normalized in-memory vector store -----------------------------------
function normalize(v: number[]): Float32Array {
  const out = new Float32Array(v.length);
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

// Built once at module load — the O(n) cost is paid a single time, not per query.
const NORMS: Float32Array[] = (corpus.chunks ?? []).map((c) => normalize(c.embedding));

function dot(a: Float32Array, b: number[]): number {
  const n = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) d += a[i] * b[i];
  return d;
}

/** Keyword-overlap fallback when a semantic corpus is served without an embedding key. */
export function keywordScore(query: string, chunk: Chunk): number {
  const q = expandedSearchTerms(query);
  if (!q.size) return 0;
  const text = chunk.text.toLocaleLowerCase();
  let hits = 0;
  for (const w of q) {
    if (w.length > 2 && text.split(/[^\p{L}\p{N}]+/u).includes(w)) hits++;
    else if (textHasSearchGroup(text, w)) hits++;
  }
  return Math.min(1, hits / q.size);
}

const asList = (value?: string | string[]) =>
  (Array.isArray(value) ? value : value ? [value] : []).map((item) => item.toLocaleLowerCase());

function metadataMatches(chunk: Chunk, opts: RetrieveOptions): boolean {
  const matches = (wanted: string[], actual?: string[]) =>
    !wanted.length || !actual?.length || wanted.some((item) => actual.map((v) => v.toLocaleLowerCase()).includes(item));
  const topics = asList(opts.topic);
  if (topics.length && chunk.topic && !topics.includes(chunk.topic.toLocaleLowerCase())) return false;
  if (!matches(asList(opts.audience), chunk.audience)) return false;
  if (!matches(asList(opts.lifeStage), chunk.life_stage)) return false;
  if (opts.language && chunk.language && chunk.language.toLocaleLowerCase() !== opts.language.toLocaleLowerCase()) return false;
  return true;
}

export function corpusInfo() {
  return {
    embedder: corpus.embedder,
    model: corpus.model,
    chunks: corpus.chunks?.length ?? 0,
    topics: Array.from(new Set((corpus.chunks ?? []).map((c) => c.topic).filter(Boolean))),
    sources_missing_review: Array.from(new Set((corpus.chunks ?? []).filter((c) => !c.reviewed_at).map((c) => c.source).filter(Boolean))),
  };
}

/**
 * Retrieve the top-k most relevant chunks for a query. Returns [] if the corpus is
 * empty or nothing clears `minScore`. Never throws.
 *
 * `boostTopic` only re-orders chunks that already clear the score threshold — it can never
 * push an irrelevant chunk over the bar, so "no false grounding" still holds.
 */
export async function retrieve(query: string, k = 4, opts: RetrieveOptions = {}): Promise<Retrieved[]> {
  const { minScore = 0.15, boostTopic, minKeywordScore = 0, maxPerSource = 2 } = opts;
  const chunks = (corpus.chunks ?? []).filter((chunk) => metadataMatches(chunk, opts));
  if (!chunks.length || !query.trim()) return [];

  let semantic: number[] = chunks.map(() => 0);
  let semanticAvailable = corpus.embedder !== "mock";
  // The offline lexical corpus is intentionally conservative: keyword overlap avoids
  // vector-hash collisions turning gibberish into apparently grounded health advice.
  if (semanticAvailable) {
    try {
      const qv = normalize(await embed(query, corpus.embedder));
      const indexByChunk = new Map((corpus.chunks ?? []).map((chunk, index) => [chunk.id, index]));
      semantic = chunks.map((chunk) => dot(NORMS[indexByChunk.get(chunk.id) ?? 0], Array.from(qv)));
    } catch {
      semanticAvailable = false;
    }
  }

  const candidates = chunks.map((c, i) => {
    const lexical = keywordScore(query, c);
    const semanticScore = Math.max(0, semantic[i] ?? 0);
    // Hybrid retrieval gives exact Bangla wording a fair chance while preserving the
    // semantic recall of real embeddings. Mock corpora intentionally stay lexical.
    const score = semanticAvailable ? semanticScore * 0.72 + lexical * 0.28 : lexical;
    const topicBoost = boostTopic && c.topic === boostTopic ? 0.04 : 0;
    return { c, score, semanticScore, lexical, ranked: score + topicBoost };
  })
    .filter((item) => item.score >= minScore)
    .filter((item) => item.lexical >= minKeywordScore || item.semanticScore >= minScore)
    .sort((a, b) => b.ranked - a.ranked);

  const selected: typeof candidates = [];
  const seenText = new Set<string>();
  const sourceCounts = new Map<string, number>();
  for (const candidate of candidates) {
    const textKey = candidate.c.text.trim().toLocaleLowerCase();
    if (!textKey || seenText.has(textKey)) continue;
    const sourceKey = candidate.c.url || candidate.c.source || candidate.c.id;
    if ((sourceCounts.get(sourceKey) ?? 0) >= maxPerSource) continue;
    selected.push(candidate);
    seenText.add(textKey);
    sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) ?? 0) + 1);
    if (selected.length >= k) break;
  }

  return selected.map(({ c, score, semanticScore, lexical }) => ({
      text: c.text,
      title: c.title,
      source: c.source,
      url: c.url,
      section: c.section || undefined,
      topic: c.topic || undefined,
      pub_year: c.pub_year || undefined,
      page: c.page || undefined,
      audience: c.audience?.length ? c.audience : undefined,
      life_stage: c.life_stage?.length ? c.life_stage : undefined,
      language: c.language || undefined,
      reviewed_at: c.reviewed_at || undefined,
      score: Math.round(score * 1000) / 1000,
      semantic_score: semanticAvailable ? Math.round(semanticScore * 1000) / 1000 : undefined,
      keyword_score: Math.round(lexical * 1000) / 1000,
    }));
}
