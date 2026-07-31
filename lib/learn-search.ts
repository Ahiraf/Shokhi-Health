const STOP_WORDS = new Set([
  "a", "an", "and", "are", "about", "can", "could", "do", "does", "for", "from", "have", "i", "in", "is", "it", "me", "my", "of", "on", "please", "tell", "that", "the", "this", "to", "want", "what", "with", "would", "you",
  "আমি", "আমার", "আছে", "একটি", "কী", "কি", "করে", "করতে", "কোন", "কোনো", "জন্য", "থেকে", "দিয়ে", "দিতে", "নিয়ে", "বলুন", "হতে", "হয়", "হওয়ার", "চাই", "আমাকে",
]);

const ALIASES: Record<string, string> = {
  cramp: "cramp", cramps: "cramp", cramping: "cramp", cramped: "cramp",
  pain: "pain", painful: "pain", pains: "pain",
  period: "period", periods: "period", periodic: "period", menstrual: "period", menstruation: "period",
  pregnant: "pregnancy", pregnancy: "pregnancy", pregnancies: "pregnancy", conceive: "pregnancy", conception: "pregnancy",
  symptom: "symptom", symptoms: "symptom", signs: "symptom", sign: "symptom",
  infection: "infection", infections: "infection", sti: "infection", stis: "infection",
  contraceptive: "contraception", contraception: "contraception", birthcontrol: "contraception",
  planning: "planning", planned: "planning", plan: "planning",
  dizzy: "dizzy", dizziness: "dizzy", fainting: "dizzy", faint: "dizzy",
  bleeding: "bleeding", bleed: "bleeding", heavy: "heavy", severe: "severe",
};

function canonicalToken(token: string): string {
  return ALIASES[token] ?? token;
}

export function searchTokens(value: string): string[] {
  return (value.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .map(canonicalToken)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/** Score a natural-language query against several bilingual searchable fields. */
export function learnSearchScore(query: string, fields: string[]): number {
  const queryTokens = Array.from(new Set(searchTokens(query)));
  if (!queryTokens.length) return 0;
  const searchable = fields.filter(Boolean).join(" ").normalize("NFKC").toLocaleLowerCase();
  const fieldTokens = new Set(searchTokens(searchable));
  const phrase = query.normalize("NFKC").toLocaleLowerCase().trim();
  let score = searchable.includes(phrase) ? queryTokens.length * 2 : 0;
  for (const token of queryTokens) {
    if (fieldTokens.has(token) || searchable.includes(token)) score += 1;
  }
  return score;
}

export function matchesLearnSearch(query: string, fields: string[]): boolean {
  if (!query.trim()) return true;
  const queryTokens = Array.from(new Set(searchTokens(query)));
  if (!queryTokens.length) return true;
  const matched = queryTokens.filter((token) => learnSearchScore(token, fields) > 0).length;
  // Natural sentences often include words that are not in a card title. Match the
  // meaningful majority, while still requiring at least one meaningful token.
  const needed = queryTokens.length === 1 ? 1 : Math.max(1, Math.ceil(queryTokens.length * 0.45));
  return matched >= needed;
}
