import { learnSearchScore } from "./learn-search";

export type LearnSuggestion = {
  id: string;
  kind: "guide" | "condition" | "source";
  label_bn: string;
  label_en: string;
  keywords?: string[];
};

export function rankLearnSuggestions(query: string, candidates: LearnSuggestion[], limit = 6): LearnSuggestion[] {
  if (query.trim().length < 2) return [];
  return candidates
    .map((candidate) => ({
      candidate,
      score: learnSearchScore(query, [candidate.label_bn, candidate.label_en, ...(candidate.keywords ?? [])]),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.label_en.localeCompare(b.candidate.label_en))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
