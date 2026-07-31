// Shokhi orchestrator. Ties conversation → symptom profile
// (Gemma) → deterministic triage (+ ML risk signals) → warm guidance (Gemma).

import { triage as runTriage, knowledge, type Profile } from "./triage";
import { riskSignals } from "./risk";
import { getBackend, deterministicExtract, llmExtractEnabled, type Backend, type ExtractionResult } from "./gemma";
import { retrieve, type Retrieved } from "./rag";
import type { Lang } from "./prompts";
import type { JourneyIntent } from "../journeys";
import type { PersonalizationContext } from "../personalization";
import { GUIDE_MASCOT_IMAGES, mascotImageFor } from "../mascot-images";
import { UNIQUE_SOURCE_TOPICS } from "../source-topics";
import { orderLearnSuggestions, rankLearnSuggestions, type LearnSuggestion } from "../learn-suggestions";
import type { TopicSuggestionCandidate } from "./gemma";

type Citation = { source: string; url: string; section?: string; pub_year?: string };

/** Dedup retrieved chunks down to unique citations, keeping section + year metadata. */
function citations(hits: Retrieved[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const h of hits) {
    const key = h.url || h.source;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ source: h.source, url: h.url, section: h.section, pub_year: h.pub_year });
  }
  return out;
}

/** A markdown "Sources" footer appended to a grounded answer, with section + year when known. */
function sourcesFooter(hits: Retrieved[], lang: Lang): string {
  const cites = citations(hits);
  if (!cites.length) return "";
  const label = lang === "en" ? "📚 Sources" : "📚 সূত্র";
  const links = cites
    .map((c) => {
      const detail = [c.section, c.pub_year].filter(Boolean).join(", ");
      const name = detail ? `${c.source} — ${detail}` : c.source;
      return c.url ? `[${name}](${c.url})` : name;
    })
    .join(" · ");
  return `\n\n**${label}:** ${links}`;
}

/** Keep the prompt small while preserving the section and citation trail Gemma needs. */
function compactGroundingContext(hits: Retrieved[]): string {
  const maxPerPassage = 1200;
  const maxTotal = 5200;
  let used = 0;
  return hits
    .map((h, i) => {
      if (used >= maxTotal) return "";
      const label = [h.source, h.section].filter(Boolean).join(" — ");
      const remaining = maxTotal - used;
      const text = h.text.slice(0, Math.min(maxPerPassage, remaining));
      used += text.length;
      return `[${i + 1}] ${label}\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

// The LLM safety net is an EXTRA Gemma call (quota + a concurrent request). Deterministic
// triage already guards every emergency, so the net is OPT-IN: set SHOKHI_SAFETY_NET=1 to
// enable it. When on, it runs concurrently with extraction so it adds no wall-clock latency.
export function safetyNetEnabled(): boolean {
  return process.env.SHOKHI_SAFETY_NET === "1";
}

/**
 * Apply the escalate-only LLM safety net to a deterministic triage result.
 *
 * If the safety classifier flagged an emergency the rules engine did NOT already catch, we
 * ESCALATE to emergency by attaching a synthetic red flag. This can only ever RAISE urgency —
 * the deterministic red flags still fire independently, so the "never under-triage" guarantee
 * holds and a real deterministic emergency is never softened. Returns the (possibly) mutated
 * result plus whether it escalated.
 */
export function applySafetyNet(
  result: any,
  safety: { emergency: boolean; reason: string | null },
): { result: any; escalated: boolean } {
  if (!safety.emergency || result.urgency === "emergency") {
    return { result, escalated: false };
  }
  const reason = safety.reason || "possible emergency symptoms";
  result.urgency = "emergency";
  // keep the human-readable label in sync with the escalated urgency
  const emLevel = (knowledge as any)?.meta?.urgency_levels?.emergency ?? {};
  result.urgency_label_bn = emLevel.label_bn ?? result.urgency_label_bn;
  result.urgency_label_en = emLevel.label_en ?? result.urgency_label_en;
  result.red_flags = [
    ...(result.red_flags ?? []),
    {
      id: "safety_net",
      source: "safety_net",
      name_bn: "সম্ভাব্য জরুরি লক্ষণ",
      name_en: "Possible emergency symptoms",
      urgency: "emergency",
      message_bn: "আপনার কথায় জরুরি হতে পারে এমন লক্ষণ শুনতে পাচ্ছি।",
      message_en: `This may be urgent (${reason}).`,
      action_bn: "দয়া করে এখনই নিকটস্থ হাসপাতালে যান বা ৯৯৯-এ কল করুন।",
      action_en: "Please go to the nearest hospital now or call 999.",
    },
  ];
  result.safety_net = { escalated: true, reason };
  return { result, escalated: true };
}

/** The user's life stage, derived from the (safe, demographic) symptom profile. */
export function lifeStageOf(profile: Profile): string {
  if (profile.is_pregnant === true || profile.is_pregnant_possible === true) return "pregnant";
  if (profile.recently_gave_birth === true) return "postpartum";
  if (profile.post_menopausal === true) return "menopause";
  const age = typeof profile.age === "number" ? profile.age : undefined;
  if (age !== undefined && age > 0 && age < 20) return "teen";
  return "";
}

// Gemma is asked not to infer symptoms, but model output is still untrusted input. In
// particular, a menstrual complaint must never become an obstetric emergency because the
// extractor guessed a pregnancy-only field. Keep those fields only when the conversation
// contains matching, explicit evidence. The rules engine remains the sole triage authority.
const PREGNANCY_CONTEXT = [
  /গর্ভবতী/u, /গর্ভধারণ/u, /গর্ভাবস্থা/u, /গর্ভের\s*শিশু/u,
  /\bpregnan(?:t|cy)\b/i, /\bexpecting\b/i,
];
const POSTPARTUM_CONTEXT = [
  /প্রসব/u, /সন্তান\s*হয়েছে/u, /বাচ্চা\s*হয়েছে/u, /সদ্য\s*মা/u,
  /\bpostpartum\b/i, /\bafter\s+(?:giving\s+)?birth\b/i, /\brecently\s+delivered\b/i,
];
const ASSERTED_PREGNANCY = [
  /আমি\s+(?:এখন\s+)?গর্ভবতী/u, /আমার\s+গর্ভধারণ\s+হয়েছে/u,
  /\bI\s+am\s+pregnant\b/i, /\bcurrently\s+pregnant\b/i,
];
const POSSIBLE_PREGNANCY = [
  /গর্ভবতী\s+হতে\s+পারি/u, /গর্ভধারণের\s+সম্ভাবনা/u,
  /\b(?:might|could|possibly)\s+be\s+pregnant\b/i,
];
const PREGNANCY_SYMPTOMS: Record<string, RegExp[]> = {
  pregnancy_bleeding: [/রক্তপাত/u, /রক্ত\s+যাচ্ছে/u, /প্রচুর\s+রক্ত/u, /অতিরিক্ত\s+রক্ত/u, /\bbleed(?:ing)?\b/i],
  pregnancy_severe_headache: [/তীব্র\s+মাথা/u, /মাথা\s+ফেটে/u, /\bsevere\s+headache\b/i],
  pregnancy_vision_changes: [/ঝাপসা/u, /চোখে\s+ঝাপসা/u, /\bblurred\s+vision\b/i, /\bflashing\s+spots?\b/i],
  pregnancy_face_hand_swelling: [/মুখ\s+ফুলে/u, /হাত\s+ফুলে/u, /\b(?:face|hand)s?\s+swelling\b/i, /\bswollen\s+(?:face|hands?)\b/i],
  pregnancy_convulsions: [/খিঁচুনি/u, /convulsion/i, /seizure/i, /\bfits?\b/i],
  reduced_fetal_movement: [/বাচ্চা\s+(?:নড়ছে|নড়ছে)\s+না/u, /নড়াচড়া\s+কম/u, /\bbaby\s+(?:is\s+)?not\s+moving\b/i, /\breduced\s+fetal\s+movement\b/i],
};
const POSTPARTUM_SYMPTOMS: Record<string, RegExp[]> = {
  postpartum_heavy_bleeding: [/প্রচুর\s+রক্ত/u, /অতিরিক্ত\s+রক্ত/u, /\bheavy\s+bleed(?:ing)?\b/i],
  postpartum_fever: [/জ্বর/u, /\bfever\b/i],
  postpartum_foul_lochia: [/দুর্গন্ধযুক্ত\s+স্রাব/u, /দুর্গন্ধ\s+যুক্ত\s+স্রাব/u, /\bfoul\s+lochia\b/i],
  breast_pain_fever: [/স্তনে\s+ব্যথা/u, /বুকের\s+ব্যথা/u, /\bbreast\s+pain\b/i],
  postpartum_sadness: [/মন\s+খারাপ/u, /দুঃখ/u, /\bpostpartum\s+(?:sadness|depression)\b/i],
};

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Remove pregnancy/postpartum fields that are not grounded in the user's conversation.
 * This protects triage from both a fresh Gemma hallucination and a stale hallucinated field
 * sent back by the client in its next request.
 */
export function guardContextualExtraction(
  extraction: ExtractionResult,
  conversation: string,
  trustedLifeStage = "",
): ExtractionResult {
  const text = conversation.trim();
  const profile = { ...extraction.profile };
  const deniedPregnancy = /গর্ভবতী\s+(?:নই|না)/u.test(text) || /\bnot\s+pregnant\b/i.test(text);
  const pregnancyContext = matchesAny(text, PREGNANCY_CONTEXT) && !deniedPregnancy;
  const postpartumContext = matchesAny(text, POSTPARTUM_CONTEXT);
  const assertedPregnancy = matchesAny(text, ASSERTED_PREGNANCY) && !deniedPregnancy;
  const possiblePregnancy = matchesAny(text, POSSIBLE_PREGNANCY);

  if (profile.is_pregnant === true && !(assertedPregnancy || trustedLifeStage === "pregnant")) {
    delete profile.is_pregnant;
  }
  if (profile.is_pregnant_possible === true && !(assertedPregnancy || possiblePregnancy || trustedLifeStage === "pregnant")) {
    delete profile.is_pregnant_possible;
  }
  if (profile.recently_gave_birth === true && !(postpartumContext || trustedLifeStage === "postpartum")) {
    delete profile.recently_gave_birth;
  }

  for (const [field, patterns] of Object.entries(PREGNANCY_SYMPTOMS)) {
    if (!pregnancyContext || !matchesAny(text, patterns)) delete profile[field];
  }
  for (const [field, patterns] of Object.entries(POSTPARTUM_SYMPTOMS)) {
    if (!postpartumContext || !matchesAny(text, patterns)) delete profile[field];
  }

  return { ...extraction, profile };
}

/** Map a life stage to the corpus topic to gently prefer during retrieval. */
function topicForStage(stage: string): string | undefined {
  switch (stage) {
    case "pregnant":
    case "postpartum":
      return "pregnancy";
    case "menopause":
      return "menopause";
    default:
      return undefined;
  }
}

/** Prefer a directly matching corpus topic when the guide has one. */
function topicForGuide(g: any): string | undefined {
  const id = String(g?.id ?? "");
  const topics: Record<string, string> = {
    adolescent_wellbeing: "adolescence",
    body_changes_and_puberty: "adolescence",
    breast_health: "breast-health",
    cervical_health: "cervical-health",
    sti_and_hiv_safety: "sexual-health",
    fertility_and_infertility: "fertility",
    healthy_relationships_and_consent: "protection",
    sleep_stress_and_self_care: "wellbeing",
    pregnancy_test_and_first_visit: "pregnancy",
    postpartum_recovery_and_breastfeeding: "postnatal-care",
    after_birth: "pregnancy",
    first_pregnancy: "pregnancy",
    contraception: "contraception",
    family_planning: "contraception",
    period_cramps: "menstruation",
    first_period: "menstruation",
    emergency_contraception: "contraception",
    pre_eclampsia_warning_signs: "pregnancy",
    gestational_diabetes: "pregnancy",
    pelvic_infection_and_pain: "infection",
  };
  return topics[id];
}

export class Assistant {
  profile: Profile;
  history: string[];
  backend: Backend;
  extraction: ExtractionResult;
  personalization: PersonalizationContext;

  constructor(profile: Profile = {}, history: string[] = [], personalization: PersonalizationContext = {}) {
    this.profile = { ...profile };
    this.history = [...history];
    this.backend = getBackend();
    this.personalization = personalization;
    this.extraction = { profile: {}, evidence: [], uncertain_fields: [], method: "deterministic" };
  }

  async addUserMessage(message: string): Promise<void> {
    this.history.push(message);
    // Gemma/local backends use structured extraction by default. Set SHOKHI_LLM_EXTRACT=0
    // when a deployment deliberately prefers the faster deterministic intake path.
    const convo = this.history.join("\n");
    const useGemma = this.backend.name !== "mock" && llmExtractEnabled();
    const rawExtraction: ExtractionResult = useGemma
      ? await this.backend.extractSymptoms(convo, this.profile)
      : {
          profile: deterministicExtract(convo, this.profile),
          evidence: [],
          uncertain_fields: [],
          method: "deterministic",
        };
    const trustedLifeStage = this.personalization.profile?.lifeStage || "";
    // Guard both newly extracted fields and profile values returned by the client. This
    // matters because a bad field from one model response can otherwise persist in the next.
    this.profile = guardContextualExtraction(
      { profile: this.profile, evidence: [], uncertain_fields: [], method: "deterministic" },
      convo,
      trustedLifeStage,
    ).profile;
    this.extraction = guardContextualExtraction(rawExtraction, convo, trustedLifeStage);
    this.profile = { ...this.profile, ...this.extraction.profile };
  }

  triage(): any {
    const result = runTriage(this.profile);
    const signals = riskSignals(this.profile);
    if (signals.length) result.risk_signals = signals;
    // life stage lets Gemma tailor tone/advice to where she is in life (context, not a rule)
    const stage = lifeStageOf(this.profile) || this.personalization.profile?.lifeStage || "";
    if (stage) result.life_stage = stage;
    return result;
  }

  explain(lang: Lang = "bn"): Promise<string> {
    return this.backend.explainTriage(this.triage(), lang, this.personalization);
  }

  nextQuestion(): string | null {
    const qs = this.triage().outstanding_questions as Record<string, string>;
    const first = Object.values(qs)[0];
    return first ?? null;
  }

  listGuides(): any[] {
    return (knowledge.guides ?? []).map((g: any) => ({
      id: g.id, icon: g.icon ?? "🌸",
      title_bn: g.title_bn ?? "", title_en: g.title_en ?? "",
      summary_bn: g.summary_bn ?? "", summary_en: g.summary_en ?? "",
      keywords: Array.isArray(g.keywords) ? g.keywords : [],
      category: g.category ?? "health",
      audience: Array.isArray(g.audience) ? g.audience : [],
      learn: g.learn === true,
      source: g.source ?? "",
      source_url: g.source_url ?? "",
      reviewed: g.reviewed ?? "",
      image: GUIDE_MASCOT_IMAGES[g.id],
    }));
  }

  async suggestLearnTopics(query: string, lang: Lang): Promise<LearnSuggestion[]> {
    const candidates: TopicSuggestionCandidate[] = [
      ...(knowledge.guides ?? []).map((guide: any) => ({
        id: guide.id,
        kind: "guide" as const,
        label_bn: guide.title_bn ?? "",
        label_en: guide.title_en ?? "",
        keywords: Array.isArray(guide.keywords) ? guide.keywords : [],
      })),
      ...(knowledge.conditions ?? [])
        .filter((condition: any) => condition.id !== "primary_dysmenorrhea")
        .map((condition: any) => ({
          id: condition.id,
          kind: "condition" as const,
          label_bn: condition.name_bn ?? "",
          label_en: condition.name_en ?? "",
          keywords: [condition.about_bn, condition.about_en].filter(Boolean),
        })),
      ...UNIQUE_SOURCE_TOPICS.map((topic) => ({
        id: topic.id,
        kind: "source" as const,
        label_bn: topic.title_bn,
        label_en: topic.title_en,
        keywords: topic.terms,
      })),
    ];
    const local = rankLearnSuggestions(query, candidates, 6);
    if (this.backend.name === "mock") return local;
    try {
      const ids = await this.backend.suggestTopics(query, lang, candidates);
      const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
      const model = ids.map((id) => byId.get(id)).filter((candidate): candidate is TopicSuggestionCandidate => Boolean(candidate));
      const merged = new Map<string, TopicSuggestionCandidate>();
      for (const candidate of [...model, ...local]) merged.set(candidate.id, candidate);
      return orderLearnSuggestions(query, Array.from(merged.values()) as LearnSuggestion[], 6);
    } catch {
      return local;
    }
  }

  /** Let Gemma choose a situation-based educational starting point; never a diagnosis or triage decision. */
  classifyJourney(message: string, lang: Lang = "bn"): Promise<JourneyIntent> {
    return this.backend.classifyJourney(message, lang);
  }

  getGuide(gid: string): any | null {
    return (knowledge.guides ?? []).find((g: any) => g.id === gid) ?? null;
  }

  findGuide(topic: string): any | null {
    const guides = knowledge.guides ?? [];
    const byId = guides.find((g: any) => g.id === topic);
    if (byId) return byId;
    const low = (topic || "").toLowerCase();
    if (!low) return null;
    let best: any = null, bestLen = 0;
    for (const g of guides) {
      for (const kw of g.keywords ?? []) {
        const k = String(kw).toLowerCase();
        if (low.includes(k) && k.length > bestLen) { best = g; bestLen = k.length; }
      }
    }
    return best;
  }

  async explainGuide(topic: string, lang: Lang = "bn"): Promise<any | null> {
    const g = this.findGuide(topic);

    // RAG: retrieve trusted passages for this topic (uses the guide's title/summary to
    // improve recall). If anything is found, Gemma answers grounded ONLY in that context
    // and we cite the sources. Otherwise we fall back to the static knowledge-base guide.
    const query = [
      topic,
      g?.title_en,
      g?.title_bn,
      g?.summary_en,
      g?.summary_bn,
      ...(Array.isArray(g?.keywords) ? g.keywords : []),
    ].filter(Boolean).join(" ");
    const stage = lifeStageOf(this.profile) || this.personalization.profile?.lifeStage || "";
    const hits = await retrieve(query, 4, {
      boostTopic: topicForGuide(g) ?? topicForStage(stage),
      lifeStage: stage || undefined,
      audience: stage || undefined,
      language: lang,
      maxPerSource: 1,
    });
    if (!g && !hits.length) return null;

    const guideMeta = g
      ? { id: g.id, icon: g.icon ?? "🌸", title_bn: g.title_bn ?? "", title_en: g.title_en ?? "", image: mascotImageFor(g.id) }
      : { id: "topic", icon: "🌸", title_bn: topic, title_en: topic };

    if (hits.length) {
      const context = compactGroundingContext(hits);
      // give Gemma the life-stage as context so the same topic is answered stage-appropriately
      const cycle = this.personalization.cycle;
      const tracker = cycle ? `\n(Private tracker context: regular=${cycle.regular ?? "unknown"}, recent pain=${cycle.recentPain ?? "unknown"}.)` : "";
      const question = stage ? `${topic}\n(Reader's life stage: ${stage}.)${tracker}` : `${topic}${tracker}`;
      const answer = await this.backend.answerGrounded(question, context, lang);
      return {
        guide: guideMeta,
        guidance: answer + sourcesFooter(hits, lang),
        grounded: true,
        sources: citations(hits),
      };
    }

    // no retrieval hits — fall back to the hand-written guide render
    return {
      guide: guideMeta,
      guidance: await this.backend.explainGuide(g, topic, lang),
      grounded: false,
      sources: [],
    };
  }

  async bustMyth(belief: string, lang: Lang = "bn"): Promise<string> {
    let fact = "";
    const low = belief.toLowerCase();
    for (const mth of knowledge.myths ?? []) {
      const key = String(mth.myth_bn).slice(0, 8);
      const enWords = String(mth.myth_en).toLowerCase().split(/\s+/).slice(0, 3);
      if ((key && belief.includes(key)) || enWords.some((w: string) => w && low.includes(w))) {
        fact = lang === "en" ? mth.fact_en || mth.fact_bn : mth.fact_bn;
        break;
      }
    }
    return this.backend.bustMyth(belief, fact, lang);
  }
}
