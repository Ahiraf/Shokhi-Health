export type SourceTopic = {
  id: string;
  icon: string;
  query: string;
  source: string;
  title_bn: string;
  title_en: string;
  desc_bn: string;
  desc_en: string;
  terms: string[];
};

// These cards map to passages already included in the local RAG corpus. Opening one asks
// Gemma for a response grounded in those sources and includes citations in the answer.
export const SOURCE_TOPICS: SourceTopic[] = [
  {
    id: "menstrual-health", icon: "🩸", query: "WHO menstrual health",
    source: "WHO", title_bn: "মাসিক স্বাস্থ্য", title_en: "Menstrual health",
    desc_bn: "মাসিক নিয়ে স্বাভাবিক যত্ন, স্বাচ্ছন্দ্য ও কখন সাহায্য নেবেন।",
    desc_en: "Everyday period care, comfort, and when to get help.",
    terms: ["period", "menstrual", "মাসিক", "পিরিয়ড", "রক্তক্ষরণ"],
  },
  {
    id: "pregnancy-care", icon: "🤰", query: "Antenatal pregnancy care in Bangladesh",
    source: "DGHS · WHO · icddr,b", title_bn: "গর্ভকালীন যত্ন", title_en: "Pregnancy care",
    desc_bn: "চেকআপ, বিপদচিহ্ন ও মা-শিশুর নিরাপদ যত্নের তথ্য।",
    desc_en: "Checkups, warning signs, and safe care for mother and baby.",
    terms: ["pregnancy", "antenatal", "pregnant", "গর্ভ", "গর্ভকাল", "মা"],
  },
  {
    id: "family-planning", icon: "🌿", query: "Family planning services in Bangladesh",
    source: "DGFP", title_bn: "পরিবার পরিকল্পনা", title_en: "Family planning",
    desc_bn: "বাংলাদেশে পদ্ধতি, বিনামূল্যের সেবা ও কোথায় সহায়তা পাবেন।",
    desc_en: "Methods, free services, and where to get help in Bangladesh.",
    terms: ["family planning", "contraception", "birth control", "পরিবার পরিকল্পনা", "জন্মনিয়ন্ত্রণ"],
  },
  {
    id: "after-pregnancy", icon: "🌸", query: "Postpregnancy family planning",
    source: "WHO", title_bn: "প্রসবের পর জন্মনিয়ন্ত্রণ", title_en: "Contraception after birth",
    desc_bn: "প্রসবের পর নিরাপদভাবে পরিবার পরিকল্পনা নিয়ে তথ্য।",
    desc_en: "Information on family planning safely after childbirth.",
    terms: ["postpartum", "after birth", "after pregnancy", "প্রসবের পর", "বাচ্চা হওয়ার পর"],
  },
  {
    id: "menstrual-regulation", icon: "🩺", query: "Menstrual regulation and post-abortion care in Bangladesh",
    source: "DGFP · DGHS", title_bn: "মাসিক নিয়ন্ত্রণ ও পরবর্তী যত্ন", title_en: "Menstrual regulation care",
    desc_bn: "বাংলাদেশে নিরাপদ সেবা ও জরুরি সাহায্য নেওয়ার তথ্য।",
    desc_en: "Safe services and when to seek urgent help in Bangladesh.",
    terms: ["menstrual regulation", "abortion care", "mr", "মাসিক নিয়ন্ত্রণ", "এমআর"],
  },
  {
    id: "hiv-services", icon: "🛡️", query: "WHO HIV prevention testing treatment services",
    source: "WHO", title_bn: "এইচআইভি সেবা", title_en: "HIV services",
    desc_bn: "প্রতিরোধ, পরীক্ষা ও চিকিৎসা সেবা সম্পর্কে সাধারণ তথ্য।",
    desc_en: "General information on prevention, testing, and treatment services.",
    terms: ["hiv", "sti", "infection", "এইচআইভি", "সংক্রমণ"],
  },
  {
    id: "pcos-care", icon: "🌿", query: "WHO polycystic ovary syndrome PCOS",
    source: "WHO", title_bn: "পিসিওএস", title_en: "PCOS",
    desc_bn: "পিসিওএস-এর সাধারণ লক্ষণ, যত্ন ও কখন চিকিৎসকের পরামর্শ নেবেন।",
    desc_en: "Common PCOS signs, care, and when to seek medical advice.",
    terms: ["pcos", "polycystic", "পিসিওএস", "ডিম্বাশয়", "অনিয়মিত মাসিক"],
  },
  {
    id: "endometriosis-care", icon: "🩺", query: "WHO endometriosis symptoms treatment",
    source: "WHO", title_bn: "এন্ডোমেট্রিওসিস", title_en: "Endometriosis",
    desc_bn: "তীব্র মাসিক ব্যথা ও এন্ডোমেট্রিওসিস নিয়ে নির্ভরযোগ্য তথ্য।",
    desc_en: "Trusted information about severe period pain and endometriosis.",
    terms: ["endometriosis", "period pain", "pelvic pain", "এন্ডোমেট্রিওসিস", "তলপেট ব্যথা"],
  },
  {
    id: "menopause-care", icon: "🌸", query: "menopause symptoms care NHS WHO",
    source: "NHS · WHO", title_bn: "মেনোপজ", title_en: "Menopause",
    desc_bn: "মেনোপজের পরিবর্তন, স্বস্তির উপায় ও কখন সাহায্য নেবেন।",
    desc_en: "Menopause changes, ways to feel better, and when to get help.",
    terms: ["menopause", "hot flash", "মেনোপজ", "হট ফ্ল্যাশ", "মাসিক বন্ধ"],
  },
];

// These topics are already represented by a Learn condition or a curated Guide card.
// Keep them available by direct URL, but do not render another copy in the source section.
const COVERED_TOPIC_IDS = new Set([
  "menstrual-health", "family-planning", "pcos-care", "endometriosis-care", "menopause-care",
]);

export const UNIQUE_SOURCE_TOPICS = SOURCE_TOPICS.filter((topic) => !COVERED_TOPIC_IDS.has(topic.id));

export function getSourceTopic(id: string): SourceTopic | undefined {
  return SOURCE_TOPICS.find((topic) => topic.id === id);
}

export function matchesSourceTopic(topic: SourceTopic, search: string): boolean {
  const value = search.trim().toLocaleLowerCase();
  if (!value) return true;
  return [topic.title_bn, topic.title_en, topic.desc_bn, topic.desc_en, topic.source, ...topic.terms]
    .some((text) => text.toLocaleLowerCase().includes(value));
}
