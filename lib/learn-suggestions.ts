import { learnSearchScore } from "./learn-search";

export type LearnSuggestion = {
  id: string;
  kind: "guide" | "condition" | "source";
  label_bn: string;
  label_en: string;
  keywords?: string[];
};

const PERIOD_PAIN_ORDER = [
  "period_cramps",
  "endometriosis",
  "pms",
  "period_emotions",
  "first_period",
  "anemia",
  "pelvic_infection_and_pain",
  "uti",
];

function isPeriodPainQuery(query: string): boolean {
  const normalized = query.normalize("NFKC").toLocaleLowerCase();
  const hasPeriod = ["period", "menstrual", "menstruation", "মাসিক", "পিরিয়ড", "পিরিয়ড"].some((token) => normalized.includes(token));
  const hasPain = ["pain", "cramp", "pelvic", "severe", "ব্যথা", "তীব্র", "ক্র্যাম্প", "যন্ত্রণা", "তলপেট"].some((token) => normalized.includes(token));
  return hasPeriod && hasPain;
}

/**
 * Gemma supplies the semantic ranking. These small product guardrails only make sure a
 * directly matching period-pain guide is not pushed out of the visible six by a broader
 * model suggestion, while preserving Gemma's order for the remaining topics.
 */
export function orderLearnSuggestions(query: string, suggestions: LearnSuggestion[], limit = 6): LearnSuggestion[] {
  if (!isPeriodPainQuery(query)) return suggestions.slice(0, limit);
  const priority = new Map(PERIOD_PAIN_ORDER.map((id, index) => [id, index]));
  return suggestions
    .map((suggestion, index) => ({ suggestion, index, priority: priority.get(suggestion.id) ?? PERIOD_PAIN_ORDER.length + index }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .slice(0, limit)
    .map(({ suggestion }) => suggestion);
}

export function rankLearnSuggestions(query: string, candidates: LearnSuggestion[], limit = 6): LearnSuggestion[] {
  if (query.trim().length < 2) return [];
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: learnSearchScore(query, [candidate.label_bn, candidate.label_en, ...(candidate.keywords ?? [])]),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.label_en.localeCompare(b.candidate.label_en))
    .map(({ candidate }) => candidate);
  return orderLearnSuggestions(query, ranked, limit);
}
