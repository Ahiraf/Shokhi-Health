// Gemma 4 backend abstraction.
//   * MockBackend   — deterministic, no network (offline / no-key fallback).
//   * GeminiBackend — hosted Gemma 4 via Google AI Studio (@google/genai), multi-key
//                     quota fallback for hosted Gemma 4 text generation.
// The urgency DECISION is made by triage.ts, never here — Gemma only does the NLP.

import * as P from "./prompts";
import type { Lang } from "./prompts";
import { detectCriticalLab } from "./personal";
import { JOURNEY_KEYS, validJourney, type JourneyIntent } from "../journeys";
import type { PersonalizationContext } from "../personalization";
import { learnSearchScore } from "../learn-search";

type Profile = Record<string, unknown>;

export interface SafetyResult {
  emergency: boolean;
  reason: string | null;
}

export interface ExtractionEvidence {
  field: string;
  text: string;
  confidence: number;
}

export interface ExtractionResult {
  profile: Profile;
  evidence: ExtractionEvidence[];
  uncertain_fields: string[];
  method: "gemma" | "deterministic";
}

export interface Backend {
  name: string;
  extractSymptoms(conversation: string, known: Profile): Promise<ExtractionResult>;
  classifyJourney(message: string, lang: Lang): Promise<JourneyIntent>;
  explainTriage(triage: any, lang: Lang, personalization?: PersonalizationContext): Promise<string>;
  bustMyth(belief: string, fact: string, lang: Lang): Promise<string>;
  explainGuide(guide: any, question: string, lang: Lang): Promise<string>;
  /** RAG: answer a question grounded ONLY in the retrieved context passages. */
  answerGrounded(question: string, context: string, lang: Lang): Promise<string>;
  suggestTopics(query: string, lang: Lang, candidates: TopicSuggestionCandidate[]): Promise<string[]>;
  /** Escalate-only safety net: does this message look like an emergency? Never downgrades. */
  safetyCheck(message: string): Promise<SafetyResult>;
  /** Streaming variant of explainTriage — yields the guidance in chunks for a live feel. */
  explainTriageStream(triage: any, lang: Lang, personalization?: PersonalizationContext): AsyncGenerator<string>;
  /** Generic on-demand generation for personalised features (notes, explanations, etc.). */
  composeStream(system: string, user: string, lang: Lang, fallback: string): AsyncGenerator<string>;
  /** Read and explain a medical report image using Gemma's multimodal input. */
  analyzeReportImage(bytes: ArrayBuffer, mime: string, lang: Lang, mode?: "standard" | "specialist"): Promise<string>;
}

export type TopicSuggestionCandidate = {
  id: string;
  kind: "guide" | "condition" | "source";
  label_bn: string;
  label_en: string;
  keywords?: string[];
};

const pickField = (obj: any, base: string, lang: Lang) =>
  (lang === "en" ? obj?.[`${base}_en`] : undefined) ?? obj?.[`${base}_bn`];

// --- deterministic guide render (offline default; both backends can use it) ----
function renderGuide(guide: any, lang: Lang): string {
  const lines: string[] = [];
  const title = pickField(guide, "title", lang);
  if (title) lines.push(`**${guide.icon ?? "🌸"} ${title}**\n`);
  const summary = pickField(guide, "summary", lang);
  if (summary) lines.push(summary + "\n");
  for (const p of pickField(guide, "points", lang) ?? []) lines.push(`• ${p}`);
  const wsd = pickField(guide, "when_see_doctor", lang);
  if (wsd) lines.push(`\n🩺 ${wsd}`);
  return lines.join("\n");
}

// --- Mock backend (deterministic, offline) -----------------------------------
const BN_DIGITS: Record<string, string> = { "০":"0","১":"1","২":"2","৩":"3","৪":"4","৫":"5","৬":"6","৭":"7","৮":"8","৯":"9" };
const toInt = (s: string) => parseInt(s.replace(/[০-৯]/g, (d) => BN_DIGITS[d]), 10);

const TRIGGERS: [string, string[]][] = [
  ["severe_pelvic_pain", ["তীব্র ব্যথা", "অসহ্য ব্যথা", "প্রচণ্ড ব্যথা", "severe pain", "unbearable pain"]],
  ["heavy_bleeding", ["অতিরিক্ত রক্ত", "প্রচুর রক্ত", "চাকা চাকা রক্ত", "প্যাড ভিজে", "heavy bleeding", "clots", "soaking"]],
  ["fainting_or_dizzy", ["মাথা ঘুর", "অজ্ঞান", "খুব দুর্বল", "faint", "dizzy", "dizziness", "very weak"]],
  ["fever", ["জ্বর", "fever"]],
  ["foul_discharge", ["দুর্গন্ধ", "গন্ধযুক্ত স্রাব", "foul", "smelly discharge"]],
  ["is_pregnant_possible", ["গর্ভবতী হতে পারি", "গর্ভধারণের সম্ভাবনা", "might be pregnant", "could be pregnant", "possibly pregnant"]],
  ["post_menopausal", ["মেনোপজ", "মাসিক বন্ধ হয়ে গেছে", "menopause", "periods stopped"]],
  ["bleeding_between_periods", ["মাঝে রক্ত", "দুই মাসিকের মাঝ", "between periods", "spotting"]],
  ["bleeding_after_sex", ["সহবাসের পর রক্ত", "মিলনের পর রক্ত", "after sex", "after intercourse"]],
  ["cycles_irregular", ["অনিয়মিত মাসিক", "মাসিক অনিয়মিত", "অনিয়মিত পিরিয়ড", "irregular period", "irregular cycle"]],
  ["missed_periods_3plus", ["৩ মাস মাসিক বন্ধ", "তিন মাস মাসিক", "মাসিক হচ্ছে না", "no period for 3", "missed period"]],
  ["excess_hair", ["অতিরিক্ত লোম", "মুখে লোম", "শরীরে লোম", "excess hair", "facial hair", "hirsut"]],
  ["persistent_acne", ["ব্রণ", "acne", "pimple"]],
  ["unexplained_weight_gain", ["ওজন বেড়ে", "ওজন বৃদ্ধি", "মোটা হয়ে", "weight gain", "gaining weight"]],
  ["pain_during_sex", ["সহবাসে ব্যথা", "মিলনে ব্যথা", "pain during sex", "painful intercourse"]],
  ["periods_disrupt_daily_life", ["ব্যথায় স্কুল", "ব্যথায় কাজ", "কাজ করতে পারি না", "can't go to school", "miss work", "stops my life"]],
  ["chronic_pelvic_pain", ["সবসময় তলপেটে ব্যথা", "মাসিক ছাড়াও ব্যথা", "constant pelvic pain", "pain all the time"]],
  ["trouble_conceiving", ["সন্তান হচ্ছে না", "বাচ্চা নিতে সমস্যা", "সন্তান নিতে সমস্যা", "trouble conceiving", "can't get pregnant", "infertil"]],
  ["pms_mood_symptoms", ["মাসিকের আগে মেজাজ", "আগে কান্না", "আগে রাগ", "mood swing", "irritable before"]],
  ["pms_physical_symptoms", ["পেট ফাঁপা", "স্তনে ব্যথা", "মাথাব্যথা", "bloating", "breast tender", "headache before"]],
  ["genital_itching", ["যৌনাঙ্গে চুলকানি", "গোপনাঙ্গে চুলকানি", "চুলকানি", "genital itch", "itching down there", "vaginal itch"]],
  ["painful_urination", ["প্রস্রাবে জ্বালা", "প্রস্রাবে ব্যথা", "burning urine", "painful urination", "burning when i pee"]],
  ["frequent_urination", ["বারবার প্রস্রাব", "ঘন ঘন প্রস্রাব", "frequent urination", "peeing often"]],
  ["fatigue_weakness", ["সবসময় ক্লান্ত", "খুব দুর্বল লাগে", "অল্পতেই হাঁপিয়ে", "always tired", "very weak", "fatigue"]],
  ["breast_lump", ["স্তনে চাকা", "স্তনে দলা", "breast lump", "lump in breast"]],
  ["pregnancy_bleeding", ["গর্ভাবস্থায় রক্ত", "গর্ভবতী অবস্থায় রক্ত", "bleeding while pregnant", "bleeding in pregnancy"]],
  ["pregnancy_severe_headache", ["গর্ভাবস্থায় তীব্র মাথাব্যথা", "severe headache pregnant", "bad headache pregnant"]],
  ["pregnancy_vision_changes", ["ঝাপসা দেখ", "চোখে ঝলক", "blurred vision", "flashing light", "spots in vision"]],
  ["pregnancy_face_hand_swelling", ["মুখ ফুলে", "হাত ফুলে", "face swelling", "hands swollen", "swollen face"]],
  ["pregnancy_convulsions", ["খিঁচুনি", "convulsion", "fits", "seizure"]],
  ["reduced_fetal_movement", ["বাচ্চা নড়ছে না", "শিশু নড়াচড়া কম", "baby not moving", "reduced movement", "baby stopped moving"]],
  ["recently_gave_birth", ["সন্তান প্রসব করেছি", "বাচ্চা হয়েছে", "সদ্য মা হয়েছি", "just gave birth", "recently delivered", "after delivery"]],
  ["postpartum_heavy_bleeding", ["প্রসবের পর অতিরিক্ত রক্ত", "প্রসবের পর প্রচুর রক্ত", "bleeding after delivery", "postpartum bleeding"]],
  ["postpartum_fever", ["প্রসবের পর জ্বর", "fever after delivery", "fever after birth"]],
  ["postpartum_foul_lochia", ["প্রসবের পর দুর্গন্ধ", "foul discharge after delivery", "smelly discharge after birth"]],
  ["breast_pain_fever", ["স্তন লাল হয়ে ব্যথা", "স্তনে ব্যথা ও জ্বর", "red painful breast", "mastitis"]],
  ["postpartum_sadness", ["প্রসবের পর মন খারাপ", "বাচ্চা হওয়ার পর কান্না", "sad after birth", "depressed after delivery", "postpartum sad"]],
  ["hot_flashes", ["হট ফ্ল্যাশ", "হঠাৎ শরীর গরম", "গরম লাগে হঠাৎ", "hot flash", "hot flush"]],
  ["night_sweats", ["রাতে ঘাম", "night sweat"]],
  ["vaginal_dryness", ["যোনিপথে শুষ্ক", "যোনি শুষ্ক", "vaginal dryness", "dryness down there"]],
  ["menopause_mood_changes", ["মাঝবয়সে মেজাজ", "ঘুমের সমস্যা", "mid-life mood", "menopause mood"]],
];
// Bangla negation almost always FOLLOWS the symptom word ("জ্বর নেই" = "fever none"),
// while English negation PRECEDES it ("no fever", "don't have fever"). Splitting the two
// keeps a Bangla "নেই" in a different clause from wrongly suppressing a later symptom.
const NEG_AFTER = ["না", "নেই", "নয়"]; // Bangla negation after the word
const NEG_BEFORE = ["not ", "no ", "without", "don't", "doesn't", "never"]; // English before
// Clause boundaries — a negation before one of these belongs to a different clause and
// must not carry over (e.g. "জ্বর নেই, কিন্তু প্রচুর রক্ত" — the bleeding is NOT negated).
const CLAUSE_SEP = [",", "।", ";", "\n", "কিন্তু", "তবে", " but "];

const T = {
  bn: {
    greeting: "আসসালামু আলাইকুম / নমস্কার। ",
    emergency: "⚠️ **এটি জরুরি অবস্থা হতে পারে।**\n",
    call: (n: string) => `\n📞 জরুরি প্রয়োজনে কল করুন: **${n}**`,
    discuss: "আপনার বর্ণনা শুনে নিচের বিষয়গুলো একজন ডাক্তারের সাথে আলোচনা করা ভালো (এটি নিশ্চিত রোগ নির্ণয় নয়):\n",
    canDo: "  যা করতে পারেন:",
    noDanger: "আপনার বর্ণনায় এই মুহূর্তে বিপদের কোনো লক্ষণ পাওয়া যায়নি। তবে কোনো দুশ্চিন্তা থাকলে নির্দ্বিধায় জিজ্ঞাসা করুন।",
    risk: "\n📊 আপনার উপসর্গের ভিত্তিতে একটি সহায়ক ঝুঁকি-ইঙ্গিত (নিশ্চিত রোগ নয়, শুধু ডাক্তার দেখানোর তাগিদ):",
    riskLine: (name: string, pct: number) => `  • ${name}: ~${pct}% ইঙ্গিত — একজন ডাক্তারের সাথে যাচাই করুন।`,
    hotline: (n: string) => `\n☎️ স্বাস্থ্য পরামর্শের জন্য বিনামূল্যে কল করতে পারেন: ${n}`,
    mythFact: (f: string) => `আপনি যা শুনেছেন তা অনেকেই বিশ্বাস করেন, তবে আসল তথ্যটি হলো: ${f}`,
    mythGeneric: "এই বিষয়ে অনেক ভুল ধারণা প্রচলিত আছে। নির্ভরযোগ্য তথ্যের জন্য একজন স্বাস্থ্যকর্মী বা ডাক্তারের সাথে কথা বলুন — লজ্জার কিছু নেই।",
  },
  en: {
    greeting: "Assalamu alaikum / Namaskar. ",
    emergency: "⚠️ **This may be an emergency.**\n",
    call: (n: string) => `\n📞 In an emergency, call: **${n}**`,
    discuss: "From what you've described, it's worth discussing the following with a doctor (this is not a confirmed diagnosis):\n",
    canDo: "  What you can do:",
    noDanger: "From what you've described, there's no sign of danger right now. But if anything worries you, feel free to ask.",
    risk: "\n📊 Based on your symptoms, one supporting risk signal (not a diagnosis, just a nudge to see a doctor):",
    riskLine: (name: string, pct: number) => `  • ${name}: ~${pct}% signal — please check with a doctor.`,
    hotline: (n: string) => `\n☎️ For free health advice you can call: ${n}`,
    mythFact: (f: string) => `Many people believe what you've heard, but the real fact is: ${f}`,
    mythGeneric: "There are many myths about this. For reliable information, talk to a health worker or doctor — there's nothing to be shy about.",
  },
} as const;

// Deterministic, offline symptom extraction (negation-aware). This remains the safety fallback
// and can be selected explicitly with SHOKHI_LLM_EXTRACT=0.
export function deterministicExtract(conversation: string, known: Profile): Profile {
  const text = conversation;
  const low = text.toLowerCase();
  const out: Profile = {};
  let m = text.match(/(?:বয়স|age)\D{0,4}([০-৯0-9]{1,3})/);
  if (!m) m = text.match(/([০-৯0-9]{1,3})\s*(?:বছর|years?)/);
  if (m) out.age = toInt(m[1]);
  if (text.includes("গর্ভবতী") && !["গর্ভবতী নই", "গর্ভবতী না"].some((n) => text.includes(n)))
    out.is_pregnant_possible = true;
  for (const [field, kws] of TRIGGERS) {
    for (const kw of kws) {
      const idx = low.indexOf(kw.toLowerCase());
      if (idx === -1) continue;
      let before = low.slice(Math.max(0, idx - 24), idx);
      // keep only the current clause: drop anything up to the last clause separator
      for (const sep of CLAUSE_SEP) {
        const s = before.lastIndexOf(sep);
        if (s !== -1) before = before.slice(s + sep.length);
      }
      const tail = low.slice(idx + kw.length, idx + kw.length + 14);
      const negated =
        NEG_BEFORE.some((n) => before.includes(n)) || NEG_AFTER.some((n) => tail.includes(n));
      out[field] = !negated;
      break;
    }
  }
  if (["মাসিক হচ্ছে", "পিরিয়ড চলছে", "রক্ত যাচ্ছে"].some((w) => text.includes(w)) || low.includes("on my period"))
    out.bleeding_now ??= true;
  return Object.fromEntries(Object.entries(out).filter(([k, v]) => known[k] !== v));
}

/** Whether to use Gemma (more robust) for extraction. On by default for Gemma/local backends. */
export function llmExtractEnabled(): boolean {
  // Gemma extraction is the default when a hosted/local Gemma backend is active.
  // Set this to 0 only for a deliberately faster deterministic intake path.
  return process.env.SHOKHI_LLM_EXTRACT !== "0";
}

class MockBackend implements Backend {
  name = "mock";

  async classifyJourney(message: string, _lang?: Lang): Promise<JourneyIntent> {
    const low = message.toLocaleLowerCase();
    const groups: Array<[JourneyIntent["journey"], string[]]> = [
      ["first_period", ["প্রথম মাসিক", "প্রথম পিরিয়ড", "first period", "menarche", "প্যাড"]],
      ["period_pain", ["মাসিকের ব্যথা", "পিরিয়ডের ব্যথা", "ক্র্যাম্প", "cramp", "period pain", "তলপেট ব্যথা"]],
      ["avoid_pregnancy", ["জন্মনিয়ন্ত্রণ", "গর্ভনিরোধ", "পিল", "কনডম", "contraception", "birth control", "avoid pregnancy"]],
      ["plan_pregnancy", ["সন্তান নিতে", "সন্তান নেওয়ার", "পরিবার পরিকল্পনা", "trying", "conceive", "planning a pregnancy"]],
      ["pregnant_now", ["গর্ভবতী", "গর্ভধারণের সম্ভাবনা", "pregnancy", "pregnant", "মাসিক বন্ধ"]],
      ["after_birth", ["প্রসবের পর", "বাচ্চা হওয়ার পর", "after birth", "postpartum", "breastfeeding"]],
    ];
    let best: JourneyIntent["journey"] = "understand_symptoms";
    let score = 0;
    for (const [journey, terms] of groups) {
      const hits = terms.filter((term) => low.includes(term.toLocaleLowerCase())).length;
      if (hits > score) { best = journey; score = hits; }
    }
    return { journey: best, confidence: best === "understand_symptoms" ? 0.35 : Math.min(0.95, 0.55 + score * 0.15), uncertain: best === "understand_symptoms", evidence: [] };
  }

  async extractSymptoms(conversation: string, known: Profile): Promise<ExtractionResult> {
    return {
      profile: deterministicExtract(conversation, known),
      evidence: [],
      uncertain_fields: [],
      method: "deterministic",
    };
  }

  async explainTriage(tr: any, lang: Lang, personalization: PersonalizationContext = {}): Promise<string> {
    const t = T[lang] ?? T.bn;
    const f = (o: any, base: string) => pickField(o, base, lang);
    const urgency = tr.urgency ?? "info";
    const lines: string[] = [t.greeting];
    if (urgency === "emergency") {
      lines.push(t.emergency);
      for (const rf of tr.red_flags ?? []) { lines.push(`• ${f(rf, "message")}`); lines.push(`  👉 ${f(rf, "action")}`); }
      lines.push(t.call(tr.emergency_number_bd ?? "999"));
    } else {
      const label = f(tr, "urgency_label");
      if (label) lines.push(`**${label}**\n`);
      for (const rf of tr.red_flags ?? []) lines.push(`• ${f(rf, "message")} — ${f(rf, "action")}`);
      const conds = tr.suspected_conditions ?? [];
      if (conds.length) {
        lines.push(t.discuss);
        for (const c of conds) {
          lines.push(`**• ${f(c, "name")}** — ${f(c, "about")}`);
          const sc = f(c, "self_care");
          if (sc?.length) { lines.push(t.canDo); for (const tip of sc) lines.push(`    - ${tip}`); }
          const sd = f(c, "see_doctor");
          if (sd) lines.push(`  🩺 ${sd}`);
          lines.push("");
        }
      } else if (urgency === "info") lines.push(t.noDanger);
    }
    const signals = (tr.risk_signals ?? []).filter((s: any) => s.elevated);
    if (signals.length) {
      lines.push(t.risk);
      for (const s of signals) lines.push(t.riskLine(f(s, "name"), Math.round(s.probability * 100)));
    }
    const cycle = personalization.cycle;
    if (urgency !== "emergency" && cycle) {
      const notes: string[] = [];
      if (cycle.regular === false) notes.push(lang === "en" ? "Your tracker shows that your periods may not be regular. Keep logging and discuss the pattern with a health worker if it continues." : "আপনার ট্র্যাকার বলছে মাসিকের সময়ে অনিয়ম থাকতে পারে। লগ করতে থাকুন; এটি চলতে থাকলে স্বাস্থ্যকর্মীর সঙ্গে কথা বলুন।");
      if ((cycle.recentPain ?? 0) >= 2) notes.push(lang === "en" ? "You recently logged moderate or strong pain. If it keeps affecting daily life, please ask a health worker for advice." : "আপনি সম্প্রতি মাঝারি বা বেশি ব্যথা লিখেছেন। দৈনন্দিন কাজে প্রভাব পড়লে স্বাস্থ্যকর্মীর পরামর্শ নিন।");
      if (cycle.recentHeavyBleeding) notes.push(lang === "en" ? "You recently logged heavy flow. If bleeding becomes very heavy, you feel faint, or you are worried, seek care promptly." : "আপনি সম্প্রতি বেশি রক্তপাতের কথা লিখেছেন। রক্তপাত খুব বেড়ে গেলে, মাথা ঘুরলে বা দুশ্চিন্তা হলে দ্রুত চিকিৎসা নিন।");
      if (notes.length) lines.push(`\n📌 ${lang === "en" ? "From your private tracker:" : "আপনার ব্যক্তিগত ট্র্যাকার থেকে:"}\n${notes.join("\n")}`);
    }
    if (tr.health_hotline_bd) lines.push(t.hotline(tr.health_hotline_bd));
    const disclaimer = f(tr, "disclaimer");
    if (disclaimer) lines.push(`\nℹ️ ${disclaimer}`);
    return lines.join("\n");
  }

  async bustMyth(_belief: string, fact: string, lang: Lang): Promise<string> {
    const t = T[lang] ?? T.bn;
    return ensureDualGreeting(fact ? t.mythFact(fact) : t.mythGeneric, lang);
  }

  async explainGuide(guide: any, _q: string, lang: Lang): Promise<string> {
    return ensureDualGreeting(renderGuide(guide, lang), lang);
  }

  // Offline grounded answer: no LLM, so return the retrieved context wrapped in a
  // caring frame. The GeminiBackend replaces this with a real Gemma-written answer.
  async answerGrounded(_question: string, context: string, lang: Lang): Promise<string> {
    const intro = lang === "en"
      ? "Here is what trusted health sources say about this:"
      : "নির্ভরযোগ্য স্বাস্থ্য-সূত্র অনুযায়ী এই বিষয়ে যা জানা যায়:";
    const outro = lang === "en"
      ? "\n\nThis is general information — please check with a doctor or health worker for what is right for you."
      : "\n\nএটি সাধারণ তথ্য — আপনার জন্য সঠিকটি জানতে একজন ডাক্তার বা স্বাস্থ্যকর্মীর পরামর্শ নিন।";
    return ensureDualGreeting(`${intro}\n\n${context}${outro}`, lang);
  }

  async suggestTopics(query: string, _lang: Lang, candidates: TopicSuggestionCandidate[]): Promise<string[]> {
    return candidates
      .map((candidate) => ({
        id: candidate.id,
        score: learnSearchScore(query, [candidate.label_bn, candidate.label_en, ...(candidate.keywords ?? [])]),
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((candidate) => candidate.id);
  }

  // Offline safety net: deterministic keyword scan for clear emergency phrasing. Escalate-only
  // by construction — it can only return emergency=true, never downgrade the rules engine.
  async safetyCheck(message: string): Promise<SafetyResult> {
    const low = message.toLowerCase();
    const EMERGENCY_PHRASES: [string, string][] = [
      ["খিঁচুনি", "convulsions"], ["seizure", "convulsions"], ["convulsion", "convulsions"], ["fits", "convulsions"],
      ["অজ্ঞান", "fainting"], ["faint", "fainting"], ["pass out", "fainting"], ["lost consciousness", "fainting"],
      ["chest pain", "chest pain"], ["বুকে ব্যথা", "chest pain"],
      ["can't breathe", "trouble breathing"], ["cannot breathe", "trouble breathing"], ["শ্বাস নিতে", "trouble breathing"],
      ["নড়ছে না", "reduced fetal movement"], ["baby not moving", "reduced fetal movement"], ["baby hasn't moved", "reduced fetal movement"], ["baby hasnt moved", "reduced fetal movement"],
      ["প্রচুর রক্ত", "heavy bleeding"], ["অতিরিক্ত রক্ত", "heavy bleeding"], ["soaking", "heavy bleeding"], ["heavy bleeding", "heavy bleeding"],
    ];
    for (const [kw, reason] of EMERGENCY_PHRASES) {
      const idx = low.indexOf(kw.toLowerCase());
      if (idx === -1) continue;
      const tail = low.slice(idx + kw.length, idx + kw.length + 14);
      if (["না ", "নেই", "not ", "no "].some((n) => tail.startsWith(n) || tail.includes(n))) continue;
      return { emergency: true, reason };
    }
    return { emergency: false, reason: null };
  }

  // Mock "streaming": yield the deterministic guidance in line-sized pieces so the client
  // stream path works offline. The GeminiBackend streams real Gemma tokens.
  async *explainTriageStream(tr: any, lang: Lang, personalization?: PersonalizationContext): AsyncGenerator<string> {
    const full = await this.explainTriage(tr, lang, personalization);
    for (const line of full.split("\n")) yield line + "\n";
  }

  // Offline: no LLM, so return the deterministic fallback the caller supplied.
  async *composeStream(_system: string, _user: string, _lang: Lang, fallback: string): AsyncGenerator<string> {
    for (const line of (fallback || "").split("\n")) yield line + "\n";
  }

  async analyzeReportImage(_bytes: ArrayBuffer, _mime: string, lang: Lang, _mode: "standard" | "specialist" = "standard"): Promise<string> {
    return lang === "en"
      ? "I couldn't read the uploaded image clearly. Please type the test name, result, unit and reference range, or show the report to a doctor or health worker."
      : "আপলোড করা ছবিটি পরিষ্কারভাবে পড়া গেল না। পরীক্ষার নাম, ফল, একক ও স্বাভাবিক সীমা লিখে দিন, অথবা রিপোর্টটি একজন ডাক্তার বা স্বাস্থ্যকর্মীকে দেখান।";
  }

}

// --- Gemini backend (hosted Gemma 4) with multi-key quota fallback ------------
export function geminiKeys(): string[] {
  const cands = [
    process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY_2 || process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_3 || process.env.GEMINI_API_KEY_3,
  ];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const k of cands) {
    if (!k || k.startsWith("paste_your") || seen.has(k)) continue;
    seen.add(k); keys.push(k);
  }
  return keys;
}

export function isRetryableGeminiError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err).toLowerCase();
  return ["429", "quota", "resource_exhausted", "rate limit", "too many requests",
    "503", "overloaded", "service unavailable", "500", "internal server error",
    "invalid api key", "api_key_invalid", "permission_denied", "401", "403"].some((m) => msg.includes(m));
}

/** Run a Google API operation against every configured key when quota/access fails. */
export async function withGeminiKeyFallback<T>(
  operation: (key: string, index: number) => Promise<T>,
): Promise<T> {
  const keys = geminiKeys();
  if (!keys.length) throw new Error("No Google API keys configured.");

  let lastError: unknown;
  for (let i = 0; i < keys.length; i++) {
    try {
      const result = await operation(keys[i], i);
      if (i > 0) console.log(`[gemini] succeeded with API key #${i + 1}`);
      return result;
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || i === keys.length - 1) throw error;
      console.warn(`[gemini] API key #${i + 1} exhausted; trying key #${i + 2}`);
    }
  }
  throw new Error(`All Google API keys exhausted. Last error: ${lastError}`);
}

const parseJson = (text: string): Profile => {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { return {}; } }
  return {};
};

function parseStringArray(text: string): string[] {
  try {
    const value = JSON.parse(text);
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  } catch { /* fall through to a conservative bracket extraction */ }
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const value = JSON.parse(match[0]);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const DUAL_GREETING = {
  bn: "আসসালামু আলাইকুম / নমস্কার।",
  en: "Assalamu alaikum / Namaskar.",
} as const;

/** Keep every human-facing model reply inclusive even when a model ignores the prompt. */
export function ensureDualGreeting(text: string, lang: Lang): string {
  const greeting = DUAL_GREETING[lang] ?? DUAL_GREETING.bn;
  const cleaned = String(text ?? "")
    .trim()
    .replace(/^(?:\*\*)?(?:আসসালামু আলাইকুম|নমস্কার|হ্যালো|assalamu alaikum|namaskar|hello)(?:\s*\/\s*(?:আসসালামু আলাইকুম|নমস্কার|assalamu alaikum|namaskar|হ্যালো|hello))?[।.!,:\-]?\s*/i, "")
    .trim();
  return cleaned ? `${greeting}\n\n${cleaned}` : greeting;
}

function stripLeadingGreeting(text: string): string {
  return String(text ?? "")
    .replace(/^(?:\s|\*)*(?:আসসালামু আলাইকুম|নমস্কার|হ্যালো|assalamu alaikum|namaskar|hello)(?:\s*\/\s*(?:আসসালামু আলাইকুম|নমস্কার|assalamu alaikum|namaskar|হ্যালো|hello))?[।.!,:\-]?\s*/i, "")
    .trimStart();
}

async function* withDualGreetingStream(source: AsyncIterable<string>, lang: Lang): AsyncGenerator<string> {
  yield `${DUAL_GREETING[lang] ?? DUAL_GREETING.bn}\n\n`;
  let pending = "";
  let flushed = false;
  for await (const chunk of source) {
    if (flushed) { yield chunk; continue; }
    pending += chunk;
    if (pending.length < 100) continue;
    const cleaned = stripLeadingGreeting(pending);
    if (cleaned) yield cleaned;
    pending = "";
    flushed = true;
  }
  if (!flushed) {
    const cleaned = stripLeadingGreeting(pending);
    if (cleaned) yield cleaned;
  }
}

const EXTRACTION_TOOL = {
  name: "record_symptoms",
  description: "Record only symptoms and demographic facts explicitly stated by the user.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      profile: {
        type: "object",
        properties: Object.fromEntries(P.SYMPTOM_FIELDS.map((field) => [
          field,
          field === "age" ? { type: "integer" } : { type: "boolean" },
        ])),
        additionalProperties: false,
      },
      evidence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            text: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["field", "text", "confidence"],
          additionalProperties: false,
        },
      },
      uncertain_fields: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["profile"],
    additionalProperties: false,
  },
};

const SUPPORT_TOOL = {
  name: "get_bd_support_numbers",
  description: "Return Bangladesh health support numbers for a safe referral. This tool has no side effects.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      reason: { type: "string", description: "Short reason for the referral" },
    },
    additionalProperties: false,
  },
};

const JOURNEY_TOOL = {
  name: "classify_shokhi_journey",
  description: "Choose the safest educational starting journey from the user's explicitly stated situation.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      journey: { type: "string", enum: [...JOURNEY_KEYS] },
      confidence: { type: "number" },
      uncertain: { type: "boolean" },
      evidence: { type: "array", items: { type: "string" } },
    },
    required: ["journey", "confidence", "uncertain", "evidence"],
    additionalProperties: false,
  },
};

const REPORT_TOOL = {
  name: "record_report_review",
  description: "Record only values visibly readable in the uploaded report image. Never guess missing values.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      image_quality: { type: "string" },
      key_findings: { type: "array", items: { type: "string" } },
      values: {
        type: "array",
        items: {
          type: "object",
          properties: {
            test: { type: "string" },
            value: { type: "string" },
            unit: { type: "string" },
            reference_range: { type: "string" },
            status: { type: "string", enum: ["within", "low", "high", "uncertain"] },
            confidence: { type: "number" },
          },
          required: ["test", "value", "status", "confidence"],
          additionalProperties: false,
        },
      },
      uncertain_values: { type: "array", items: { type: "string" } },
      safe_next_step: { type: "string" },
    },
    required: ["image_quality", "values", "uncertain_values", "safe_next_step"],
    additionalProperties: false,
  },
};

function reportPrompt(lang: Lang, mode: "standard" | "specialist"): string {
  const specialist = mode === "specialist";
  return lang === "en"
    ? `You are reviewing a medical report image for Shokhi. ${specialist ? "Use strict specialist review." : "Use a careful general review."} Call record_report_review exactly once. Record only text and numbers visibly readable in the image. Compare a result only with the reference range printed beside it. If blurry, omit it and list it in uncertain_values. Never diagnose, prescribe, or invent a value. Keep the safe next step short.`
    : `আপনি সখীর জন্য একটি মেডিকেল রিপোর্টের ছবি যাচাই করছেন। ${specialist ? "কঠোর বিশেষজ্ঞ যাচাই করুন।" : "সতর্ক সাধারণ যাচাই করুন।"} ঠিক একবার record_report_review কল করুন। ছবিতে স্পষ্ট দেখা যায় এমন লেখা ও সংখ্যাই লিখুন। শুধু রিপোর্টে ছাপা স্বাভাবিক সীমার সঙ্গে তুলনা করুন। ঝাপসা হলে বাদ দিয়ে uncertain_values-এ লিখুন। রোগ নির্ণয়, ওষুধ বা অনুমান করবেন না। নিরাপদ পরবর্তী পদক্ষেপ সংক্ষিপ্ত রাখুন।`;
}

function renderReportReview(raw: any, lang: Lang): string {
  const en = lang === "en";
  const quality = typeof raw?.image_quality === "string" ? raw.image_quality.trim() : "";
  const findings = Array.isArray(raw?.key_findings) ? raw.key_findings.filter((x: unknown) => typeof x === "string").slice(0, 8) : [];
  const values = Array.isArray(raw?.values) ? raw.values.slice(0, 30) : [];
  const uncertain = Array.isArray(raw?.uncertain_values) ? raw.uncertain_values.filter((x: unknown) => typeof x === "string").slice(0, 12) : [];
  const lines: string[] = [];
  lines.push(en ? "## Image quality" : "## ছবির মান");
  lines.push(quality || (en ? "The image quality could not be confirmed." : "ছবির মান নিশ্চিত করা যায়নি।"));
  lines.push("");
  lines.push(en ? "## Key findings" : "## প্রধান ফল");
  if (findings.length) findings.forEach((item: string) => lines.push(`• ${item}`));
  else lines.push(en ? "No clear finding was extracted." : "কোনো স্পষ্ট ফল পড়া যায়নি।");
  lines.push("");
  lines.push(en ? "## Value-by-value review" : "## প্রতিটি মানের পর্যালোচনা");
  if (values.length) {
    for (const item of values) {
      if (!item || typeof item.test !== "string" || typeof item.value !== "string") continue;
      const range = typeof item.reference_range === "string" && item.reference_range ? `; ${en ? "range" : "সীমা"}: ${item.reference_range}` : "";
      const unit = typeof item.unit === "string" && item.unit ? ` ${item.unit}` : "";
      const status = item.status === "low" ? (en ? "low" : "কম") : item.status === "high" ? (en ? "high" : "বেশি") : item.status === "within" ? (en ? "within the printed range" : "ছাপা সীমার মধ্যে") : (en ? "uncertain" : "অনিশ্চিত");
      lines.push(`• ${item.test}: ${item.value}${unit} — ${status}${range}`);
    }
  } else lines.push(en ? "No test value was clear enough to list." : "কোনো পরীক্ষার মান যথেষ্ট স্পষ্ট নয়।");
  if (uncertain.length) {
    lines.push(en ? "Uncertain:" : "অনিশ্চিত:");
    lines.push(...uncertain.map((item: string) => `• ${item}`));
  }
  lines.push("");
  lines.push(en ? "## Safe next step" : "## নিরাপদ পরবর্তী পদক্ষেপ");
  lines.push(typeof raw?.safe_next_step === "string" && raw.safe_next_step.trim()
    ? raw.safe_next_step.trim()
    : en ? "Please confirm this report with a doctor or qualified health worker." : "এই রিপোর্টটি একজন ডাক্তার বা যোগ্য স্বাস্থ্যকর্মীর সঙ্গে নিশ্চিত করুন।");
  return lines.join("\n");
}

function normaliseExtraction(args: any, known: Profile, method: "gemma" | "deterministic"): ExtractionResult {
  const rawProfile = args?.profile && typeof args.profile === "object" ? args.profile : args;
  const allowed = new Set(P.SYMPTOM_FIELDS);
  const profile: Profile = {};
  for (let [key, value] of Object.entries(rawProfile ?? {})) {
    if (!allowed.has(key)) continue;
    if (key === "age") {
      const n = Number(value);
      if (!Number.isInteger(n) || n <= 0 || n > 120) continue;
      value = n;
    } else if (typeof value === "string") {
      const lv = value.toLowerCase();
      if (["true", "yes", "হ্যাঁ"].includes(lv)) value = true;
      else if (["false", "no", "না"].includes(lv)) value = false;
      else continue;
    }
    if (typeof value !== "boolean" && typeof value !== "number") continue;
    if (known[key] !== value) profile[key] = value;
  }
  const evidence = Array.isArray(args?.evidence)
    ? args.evidence
      .filter((item: any) => item && allowed.has(String(item.field)) && typeof item.text === "string")
      .slice(0, 12)
      .map((item: any) => ({
        field: String(item.field),
        text: item.text.slice(0, 160),
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
      }))
    : [];
  const uncertain_fields = Array.isArray(args?.uncertain_fields)
    ? args.uncertain_fields.filter((field: unknown): field is string => typeof field === "string" && allowed.has(field)).slice(0, 12)
    : [];
  return { profile, evidence, uncertain_fields, method };
}

function normaliseJourney(args: any): JourneyIntent {
  const confidence = Math.max(0, Math.min(1, Number(args?.confidence) || 0));
  const journey = validJourney(args?.journey);
  const evidence = Array.isArray(args?.evidence)
    ? args.evidence
      .filter((item: unknown): item is string => typeof item === "string")
      .slice(0, 4)
      .map((item: string) => item.slice(0, 140))
    : [];
  return { journey, confidence, uncertain: args?.uncertain === true || journey === "understand_symptoms", evidence };
}

class GeminiBackend implements Backend {
  name = "gemini";
  private keys = geminiKeys();
  private clients: any[] = [];
  private model = process.env.SHOKHI_GEMMA_MODEL || "gemma-4-26b-a4b-it";
  private fallback = new MockBackend();

  constructor() {
    if (!this.keys.length) throw new Error("No API key. Set GOOGLE_API_KEY (+ optional _2/_3).");
    this.clients = new Array(this.keys.length).fill(null);
  }

  private async clientFor(i: number) {
    if (!this.clients[i]) {
      const { GoogleGenAI } = await import("@google/genai");
      this.clients[i] = new GoogleGenAI({ apiKey: this.keys[i] });
    }
    return this.clients[i];
  }

  private async withFallback<T>(call: (client: any) => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < this.keys.length; i++) {
      try {
        const r = await call(await this.clientFor(i));
        if (i > 0) console.log(`[gemini] succeeded with API key #${i + 1}`);
        return r;
      } catch (err) {
        lastErr = err;
        if (isRetryableGeminiError(err) && i < this.keys.length - 1) {
          console.log(`[gemini] key #${i + 1} exhausted, falling back…`);
          continue;
        }
        throw err;
      }
    }
    throw new Error(`All Gemini API keys exhausted. Last error: ${lastErr}`);
  }

  private thinkingLevel(kind: "routine" | "ambiguous" = "routine"): "minimal" | "high" {
    if (process.env.SHOKHI_THINKING === "high") return "high";
    if (process.env.SHOKHI_THINKING === "minimal") return "minimal";
    return kind === "ambiguous" ? "high" : "minimal";
  }

  private async generate(system: string, user: string, temperature = 0.3, kind: "routine" | "ambiguous" = "routine"): Promise<string> {
    const resp: any = await this.withFallback((c) =>
      c.models.generateContent({
        model: this.model,
        contents: user,
        config: {
          systemInstruction: system,
          temperature,
          maxOutputTokens: 500,
          thinkingConfig: { thinkingLevel: this.thinkingLevel(kind) },
        },
      }));
    return (resp.text ?? "").trim();
  }

  private async *generateStream(system: string, user: string, temperature = 0.4, kind: "routine" | "ambiguous" = "routine"): AsyncGenerator<string> {
    // Open the stream through the same multi-key fallback used for non-streaming calls.
    const stream: any = await this.withFallback((c) =>
      c.models.generateContentStream({
        model: this.model,
        contents: user,
        config: {
          systemInstruction: system,
          temperature,
          maxOutputTokens: 500,
          thinkingConfig: { thinkingLevel: this.thinkingLevel(kind) },
        },
      }));
    for await (const chunk of stream) {
      const t = chunk?.text ?? "";
      if (t) yield t;
    }
  }

  private async generateWithSafeTools(
    system: string,
    user: string,
    temperature = 0.3,
    kind: "routine" | "ambiguous" = "routine",
  ): Promise<string> {
    let contents: any[] = [{ role: "user", parts: [{ text: user }] }];
    for (let round = 0; round < 2; round++) {
      const response: any = await this.withFallback((c) => c.models.generateContent({
        model: this.model,
        contents,
        config: {
          systemInstruction: system,
          temperature,
          maxOutputTokens: 500,
          thinkingConfig: { thinkingLevel: this.thinkingLevel(kind) },
          tools: [{ functionDeclarations: [SUPPORT_TOOL] }],
          toolConfig: {
            functionCallingConfig: {
              mode: "AUTO",
              allowedFunctionNames: [SUPPORT_TOOL.name],
            },
          },
        },
      }));
      const calls = response.functionCalls ?? [];
      if (!calls.length) return (response.text ?? "").trim();
      const modelContent = response.candidates?.[0]?.content ?? {
        role: "model",
        parts: calls.map((call: any) => ({ functionCall: call })),
      };
      contents.push(modelContent);
      contents.push({
        role: "user",
        parts: calls.map((call: any) => ({
          functionResponse: {
            name: call.name,
            response: {
              emergency_number: "999",
              health_hotline: "16263",
              reason: typeof call.args?.reason === "string" ? call.args.reason.slice(0, 160) : "health guidance",
            },
          },
        })),
      });
    }
    return "";
  }

  async extractSymptoms(conversation: string, known: Profile): Promise<ExtractionResult> {
    const raw = await this.withFallback((c) => c.models.generateContent({
      model: this.model,
      contents: P.extractUser(conversation, JSON.stringify(known)),
      config: {
        systemInstruction: P.EXTRACT_SYSTEM,
        temperature: 0,
        maxOutputTokens: 700,
        thinkingConfig: { thinkingLevel: this.thinkingLevel("ambiguous") },
        tools: [{ functionDeclarations: [EXTRACTION_TOOL] }],
        toolConfig: {
          functionCallingConfig: {
            mode: "ANY",
            allowedFunctionNames: ["record_symptoms"],
          },
        },
      },
    })) as any;
    const call = raw.functionCalls?.[0];
    const data = call?.args ?? parseJson(raw.text ?? "");
    return normaliseExtraction(data, known, "gemma");
  }

  async classifyJourney(message: string, lang: Lang): Promise<JourneyIntent> {
    const raw = await this.withFallback((c) => c.models.generateContent({
      model: this.model,
      contents: P.journeyUser(message, lang),
      config: {
        systemInstruction: P.JOURNEY_SYSTEM,
        temperature: 0,
        maxOutputTokens: 180,
        thinkingConfig: { thinkingLevel: "minimal" },
        tools: [{ functionDeclarations: [JOURNEY_TOOL] }],
        toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [JOURNEY_TOOL.name] } },
      },
    })) as any;
    return normaliseJourney(raw.functionCalls?.[0]?.args ?? parseJson(raw.text ?? ""));
  }

  async explainTriage(tr: any, lang: Lang, personalization: PersonalizationContext = {}) {
    const system = P.withLanguage(P.EXPLAIN_SYSTEM, lang);
    const user = P.explainUserWithContext(JSON.stringify(tr), JSON.stringify(personalization));
    const kind = tr.urgency === "emergency" || tr.urgency === "see_doctor_soon" ? "ambiguous" : "routine";
    try {
      const generated = await this.generateWithSafeTools(system, user, 0.4, kind);
      // A tool-only or empty model response must never reach the user as greeting-only text.
      if (stripLeadingGreeting(generated).length < 24) return this.fallback.explainTriage(tr, lang, personalization);
      return ensureDualGreeting(generated, lang);
    } catch {
      return this.fallback.explainTriage(tr, lang, personalization);
    }
  }
  async *explainTriageStream(tr: any, lang: Lang, personalization: PersonalizationContext = {}) {
    const ambiguous = tr.urgency === "emergency" || (tr.outstanding_questions && Object.keys(tr.outstanding_questions).length > 0);
    let generated = "";
    try {
      for await (const chunk of this.generateStream(
        P.withLanguage(P.EXPLAIN_SYSTEM, lang),
        P.explainUserWithContext(JSON.stringify(tr), JSON.stringify(personalization)),
        0.4,
        ambiguous ? "ambiguous" : "routine",
      )) generated += chunk;
    } catch {
      generated = "";
    }
    const full = stripLeadingGreeting(generated).length < 24
      ? await this.explainTriage(tr, lang, personalization)
      : ensureDualGreeting(generated, lang);
    for (const line of full.split("\n")) yield line + "\n";
  }
  composeStream(system: string, user: string, lang: Lang, _fallback: string) {
    return withDualGreetingStream(this.generateStream(P.withLanguage(system, lang), user, 0.5), lang);
  }
  async analyzeReportImage(bytes: ArrayBuffer, mime: string, lang: Lang, mode: "standard" | "specialist" = "standard"): Promise<string> {
    const response: any = await this.withFallback((c) => c.models.generateContent({
      model: this.model,
      contents: [{
        role: "user",
        // Gemma 4's image guidance recommends putting the image before the text.
        parts: [
          { inlineData: { mimeType: mime.split(";")[0], data: Buffer.from(bytes).toString("base64") } },
          { text: reportPrompt(lang, mode) },
        ],
      }],
      config: {
        maxOutputTokens: 700,
        thinkingConfig: { thinkingLevel: "high" },
        tools: [{ functionDeclarations: [REPORT_TOOL] }],
        toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: [REPORT_TOOL.name] } },
      },
    }));
    const call = response.functionCalls?.[0];
    if (call?.args) {
      const structured = renderReportReview(call.args, lang);
      // Keep the deterministic report guard independent of the model's wording.
      const critical = detectCriticalLab(structured);
      return ensureDualGreeting(critical.level ? `${structured}\n\n${lang === "en" ? critical.note_en : critical.note_bn}` : structured, lang);
    }
    const text = (response.text ?? "").trim();
    if (!text) throw new Error("Gemma returned no report analysis.");
    return ensureDualGreeting(text, lang);
  }
  async safetyCheck(message: string): Promise<SafetyResult> {
    try {
      const raw = await this.generate(P.SAFETY_SYSTEM, P.safetyUser(message), 0.0);
      const data: any = parseJson(raw);
      return { emergency: data?.emergency === true, reason: typeof data?.reason === "string" ? data.reason : null };
    } catch {
      // Fail SAFE for the deterministic engine: if the classifier errors, don't manufacture
      // an emergency AND don't suppress one — the rules engine remains the source of truth.
      return { emergency: false, reason: null };
    }
  }
  bustMyth(belief: string, fact: string, lang: Lang) {
    return this.generate(P.withLanguage(P.MYTH_SYSTEM, lang), P.mythUser(belief, fact), 0.4).then((text) => ensureDualGreeting(text, lang));
  }
  explainGuide(guide: any, question: string, lang: Lang) {
    return this.generate(P.withLanguage(P.GUIDE_SYSTEM, lang), P.guideUser(JSON.stringify(guide), question), 0.4).then((text) => ensureDualGreeting(text, lang));
  }
  answerGrounded(question: string, context: string, lang: Lang) {
    // Low temperature: stay faithful to the retrieved context (RAG).
    return this.generate(P.withLanguage(P.GROUNDED_SYSTEM, lang), P.groundedUser(context, question), 0.2).then((text) => ensureDualGreeting(text, lang));
  }
  async suggestTopics(query: string, lang: Lang, candidates: TopicSuggestionCandidate[]): Promise<string[]> {
    const compact = JSON.stringify(candidates.map(({ id, label_bn, label_en, keywords }) => ({ id, label_bn, label_en, keywords: keywords?.slice(0, 8) })));
    return parseStringArray(await this.generate(P.withLanguage(P.SUGGEST_SYSTEM, lang), P.suggestUser(query, compact), 0.1));
  }

}

// Local Gemma adapter. It speaks the OpenAI-compatible API exposed by Ollama,
// llama.cpp servers, and similar local runtimes. This keeps the app's orchestration
// identical while allowing a privacy/offline deployment with SHOKHI_BACKEND=local.
class LocalGemmaBackend implements Backend {
  name = "local-gemma";
  private url = process.env.SHOKHI_LOCAL_GEMMA_URL || "http://127.0.0.1:11434/v1/chat/completions";
  private model = process.env.SHOKHI_LOCAL_GEMMA_MODEL || "gemma-4-e4b-it";
  private fallback = new MockBackend();

  private async chat(system: string, user: string, image?: { bytes: ArrayBuffer; mime: string }): Promise<string> {
    const content: any = image
      ? [{ type: "image_url", image_url: { url: `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}` } }, { type: "text", text: user }]
      : user;
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "system", content: system }, { role: "user", content }],
        temperature: 0.2,
      }),
    });
    const data = await response.json().catch(() => ({})) as any;
    if (!response.ok) throw new Error(data?.error?.message || `Local Gemma request failed: ${response.status}`);
    const text = data?.choices?.[0]?.message?.content;
    if (Array.isArray(text)) return text.map((part: any) => part?.text || "").join("").trim();
    if (typeof text !== "string" || !text.trim()) throw new Error("Local Gemma returned no text.");
    return text.trim();
  }

  async extractSymptoms(conversation: string, known: Profile): Promise<ExtractionResult> {
    try {
      const text = await this.chat(P.EXTRACT_SYSTEM, P.extractUser(conversation, JSON.stringify(known)));
      return normaliseExtraction(parseJson(text), known, "gemma");
    } catch {
      return { profile: deterministicExtract(conversation, known), evidence: [], uncertain_fields: [], method: "deterministic" };
    }
  }

  async classifyJourney(message: string, lang: Lang): Promise<JourneyIntent> {
    try {
      const text = await this.chat(P.JOURNEY_SYSTEM, P.journeyUser(message, lang));
      return normaliseJourney(parseJson(text));
    } catch {
      return this.fallback.classifyJourney(message, lang);
    }
  }

  async explainTriage(tr: any, lang: Lang, personalization: PersonalizationContext = {}): Promise<string> {
    try { return ensureDualGreeting(await this.chat(P.withLanguage(P.EXPLAIN_SYSTEM, lang), P.explainUserWithContext(JSON.stringify(tr), JSON.stringify(personalization))), lang); }
    catch { return this.fallback.explainTriage(tr, lang, personalization); }
  }

  async bustMyth(belief: string, fact: string, lang: Lang): Promise<string> {
    try { return ensureDualGreeting(await this.chat(P.withLanguage(P.MYTH_SYSTEM, lang), P.mythUser(belief, fact)), lang); }
    catch { return this.fallback.bustMyth(belief, fact, lang); }
  }

  async explainGuide(guide: any, question: string, lang: Lang): Promise<string> {
    try { return ensureDualGreeting(await this.chat(P.withLanguage(P.GUIDE_SYSTEM, lang), P.guideUser(JSON.stringify(guide), question)), lang); }
    catch { return this.fallback.explainGuide(guide, question, lang); }
  }

  async answerGrounded(question: string, context: string, lang: Lang): Promise<string> {
    try { return ensureDualGreeting(await this.chat(P.withLanguage(P.GROUNDED_SYSTEM, lang), P.groundedUser(context, question)), lang); }
    catch { return this.fallback.answerGrounded(question, context, lang); }
  }

  async suggestTopics(query: string, lang: Lang, candidates: TopicSuggestionCandidate[]): Promise<string[]> {
    try {
      const compact = JSON.stringify(candidates.map(({ id, label_bn, label_en, keywords }) => ({ id, label_bn, label_en, keywords: keywords?.slice(0, 8) })));
      return parseStringArray(await this.chat(P.withLanguage(P.SUGGEST_SYSTEM, lang), P.suggestUser(query, compact)));
    } catch {
      return this.fallback.suggestTopics(query, lang, candidates);
    }
  }

  async safetyCheck(message: string): Promise<SafetyResult> {
    try {
      const data: any = parseJson(await this.chat(P.SAFETY_SYSTEM, P.safetyUser(message)));
      return { emergency: data?.emergency === true, reason: typeof data?.reason === "string" ? data.reason : null };
    } catch { return this.fallback.safetyCheck(message); }
  }

  async *explainTriageStream(tr: any, lang: Lang, personalization?: PersonalizationContext): AsyncGenerator<string> {
    const full = await this.explainTriage(tr, lang, personalization);
    for (const line of full.split("\n")) yield line + "\n";
  }

  async *composeStream(system: string, user: string, lang: Lang, fallback: string): AsyncGenerator<string> {
    let full = fallback;
    try { full = ensureDualGreeting(await this.chat(P.withLanguage(system, lang), user), lang); } catch { full = ensureDualGreeting(full, lang); }
    for (const line of (full || "").split("\n")) yield line + "\n";
  }

  async analyzeReportImage(bytes: ArrayBuffer, mime: string, lang: Lang, mode: "standard" | "specialist" = "standard"): Promise<string> {
    try {
      return ensureDualGreeting(await this.chat(reportPrompt(lang, mode), lang === "en" ? "Read the attached report image and return the four requested sections." : "সংযুক্ত রিপোর্টের ছবিটি পড়ে চারটি চাওয়া অংশে উত্তর দিন।", { bytes, mime: mime.split(";")[0] }), lang);
    } catch {
      return this.fallback.analyzeReportImage(bytes, mime, lang, mode);
    }
  }
}

// --- Factory: gemini if a key is present (or SHOKHI_BACKEND=gemini), else mock ---
let cached: Backend | null = null;
export function getBackend(): Backend {
  if (cached) return cached;
  const forced = process.env.SHOKHI_BACKEND;
  const hasKey = geminiKeys().length > 0;
  cached = forced === "mock" ? new MockBackend()
    : forced === "local" ? new LocalGemmaBackend()
    : forced === "gemini" || hasKey ? new GeminiBackend()
    : new MockBackend();
  return cached;
}
