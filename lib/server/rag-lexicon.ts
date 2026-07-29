// Small, reviewed search vocabulary for common Bangla/English health wording.
// This is retrieval-only: it does not change symptom extraction or triage decisions.

export type SearchTermGroup = { key: string; terms: string[] };

export const SEARCH_TERM_GROUPS: SearchTermGroup[] = [
  { key: "period", terms: ["period", "periods", "menstrual", "menstruation", "পিরিয়ড", "পিরিয়ড", "মাসিক", "মাসিকের"] },
  { key: "period_pain", terms: ["period pain", "period cramps", "menstrual pain", "menstrual cramps", "cramps", "cramp", "মাসিকের ব্যথা", "পিরিয়ডের ব্যথা", "পিরিয়ডের ব্যথা", "ক্র্যাম্প", "তলপেট ব্যথা"] },
  { key: "pregnancy", terms: ["pregnancy", "pregnant", "গর্ভাবস্থা", "গর্ভবতী", "গর্ভধারণ"] },
  { key: "postpartum", terms: ["postpartum", "after birth", "after delivery", "প্রসবের পর", "বাচ্চা হওয়ার পর", "বাচ্চা হওয়ার পর"] },
  { key: "menopause", terms: ["menopause", "menopausal", "মেনোপজ", "মাসিক বন্ধ", "হট ফ্ল্যাশ", "hot flash"] },
  { key: "contraception", terms: ["contraception", "birth control", "family planning", "জন্মনিয়ন্ত্রণ", "জন্মনিয়ন্ত্রণ", "গর্ভনিরোধ", "পরিবার পরিকল্পনা"] },
  { key: "nutrition", terms: ["nutrition", "nutritional", "food", "diet", "পুষ্টি", "খাবার", "খাদ্য", "পুষ্টিকর"] },
  { key: "hygiene", terms: ["hygiene", "sanitation", "wash", "handwashing", "পরিষ্কার", "স্বাস্থ্যবিধি", "হাত ধোয়া", "হাত ধোয়া", "স্যানিটেশন"] },
  { key: "mental_health", terms: ["mental health", "wellbeing", "well-being", "stress", "anxiety", "মন ভালো", "মানসিক স্বাস্থ্য", "দুশ্চিন্তা", "উদ্বেগ", "মন খারাপ"] },
  { key: "violence", terms: ["violence", "abuse", "safety", "harassment", "সহিংসতা", "নির্যাতন", "নিরাপত্তা", "হয়রানি", "হয়রানি"] },
  { key: "disability", terms: ["disability", "disabled", "inclusion", "প্রতিবন্ধিতা", "প্রতিবন্ধী", "অন্তর্ভুক্তি"] },
  { key: "climate", terms: ["climate", "flood", "cyclone", "heat", "জলবায়ু", "জলবায়ু", "বন্যা", "ঘূর্ণিঝড়", "ঘূর্ণিঝড়", "তাপ"] },
  { key: "adolescent", terms: ["adolescent", "adolescence", "teen", "teenager", "কিশোর", "কিশোরী", "কৈশোর"] },
  { key: "water", terms: ["water", "drinking water", "পানি", "জল", "খাবার পানি", "পানীয় জল", "পানীয় জল"] },
  { key: "education", terms: ["education", "school", "learning", "শিক্ষা", "স্কুল", "শেখা"] },
];

function normalise(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase().replace(/[‐‑‒–—]/g, "-");
}

export function expandedSearchTerms(value: string): Set<string> {
  const text = normalise(value);
  const terms = new Set(text.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1));
  for (const group of SEARCH_TERM_GROUPS) {
    if (group.terms.some((term) => text.includes(normalise(term)))) terms.add(group.key);
  }
  return terms;
}

export function textHasSearchGroup(value: string, key: string): boolean {
  const group = SEARCH_TERM_GROUPS.find((item) => item.key === key);
  return Boolean(group?.terms.some((term) => normalise(value).includes(normalise(term))));
}
