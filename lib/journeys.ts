/**
 * Situation-first navigation for Learn and Guides.
 *
 * These are user intents, not diagnoses. They help a first-time visitor find a
 * safe starting point without needing to know medical words such as PCOS.
 */
export const JOURNEY_KEYS = [
  "first_period",
  "period_pain",
  "avoid_pregnancy",
  "plan_pregnancy",
  "pregnant_now",
  "after_birth",
  "understand_symptoms",
] as const;

export type JourneyKey = (typeof JOURNEY_KEYS)[number];

export type JourneyIntent = {
  journey: JourneyKey;
  confidence: number;
  uncertain: boolean;
  evidence: string[];
};

export type Journey = {
  key: JourneyKey;
  icon: string;
  imageVariant: string;
  title_bn: string;
  title_en: string;
  desc_bn: string;
  desc_en: string;
  keywords: string[];
};

export const JOURNEYS: Journey[] = [
  {
    key: "first_period",
    icon: "🌼",
    imageVariant: "learn",
    title_bn: "আমার প্রথম মাসিক",
    title_en: "My first period",
    desc_bn: "কি স্বাভাবিক, প্যাড কীভাবে ব্যবহার করবেন, আর কখন সাহায্য চাইবেন।",
    desc_en: "What is normal, how to use a pad, and when to ask for help.",
    keywords: ["first period", "menarche", "teen", "কিশোরী", "প্রথম মাসিক", "প্যাড"],
  },
  {
    key: "period_pain",
    icon: "🌸",
    imageVariant: "today",
    title_bn: "মাসিকের ব্যথা",
    title_en: "Period cramps",
    desc_bn: "আরাম পাওয়ার সহজ উপায় এবং কোন ব্যথা পরীক্ষা করানো দরকার।",
    desc_en: "Simple comfort steps and pain that deserves a check-up.",
    keywords: ["cramp", "period pain", "dysmenorrhea", "ব্যথা", "মাসিকের ব্যথা", "তলপেট"],
  },
  {
    key: "avoid_pregnancy",
    icon: "🛡️",
    imageVariant: "guides",
    title_bn: "এখনই গর্ভধারণ চাই না",
    title_en: "I want to avoid pregnancy",
    desc_bn: "কনডম, পিল, ইনজেকশন, ইমপ্লান্ট ও জরুরি পিল বুঝে নিন।",
    desc_en: "Understand condoms, pills, injections, implants, and emergency options.",
    keywords: ["contraception", "birth control", "pill", "condom", "জন্মনিয়ন্ত্রণ", "পিল", "কনডম"],
  },
  {
    key: "plan_pregnancy",
    icon: "🌿",
    imageVariant: "profile",
    title_bn: "সন্তান নেওয়ার পরিকল্পনা",
    title_en: "We are planning a pregnancy",
    desc_bn: "আগে থেকে কী প্রস্তুতি নিলে মা ও শিশুর জন্য ভালো হয়।",
    desc_en: "Helpful preparation before trying for a baby.",
    keywords: ["family planning", "trying", "conceive", "fertility", "পরিবার পরিকল্পনা", "সন্তান নিতে"],
  },
  {
    key: "pregnant_now",
    icon: "🤰",
    imageVariant: "report",
    title_bn: "আমি গর্ভবতী হতে পারি",
    title_en: "I may be pregnant",
    desc_bn: "পরীক্ষা, প্রথম চেকআপ, যত্ন এবং বিপদচিহ্ন সম্পর্কে জানুন।",
    desc_en: "Testing, the first check-up, care, and warning signs.",
    keywords: ["pregnant", "pregnancy", "antenatal", "গর্ভবতী", "গর্ভকাল", "মাসিক বন্ধ"],
  },
  {
    key: "after_birth",
    icon: "🫶",
    imageVariant: "today",
    title_bn: "সন্তান হওয়ার পর",
    title_en: "After giving birth",
    desc_bn: "মায়ের শরীর, মন, বুকের দুধ ও পরের গর্ভধারণের পরিকল্পনা।",
    desc_en: "Recovery, mood, breastfeeding, and planning the next pregnancy.",
    keywords: ["postpartum", "after birth", "breastfeeding", "প্রসবের পর", "বাচ্চা হওয়ার পর"],
  },
  {
    key: "understand_symptoms",
    icon: "🔎",
    imageVariant: "chat",
    title_bn: "আমার কিছু উপসর্গ আছে",
    title_en: "I want to understand my symptoms",
    desc_bn: "PCOS, এন্ডোমেট্রিওসিস, রক্তস্বল্পতা ও আরও বিষয় সহজ ভাষায়।",
    desc_en: "PCOS, endometriosis, anaemia, and other topics in plain language.",
    keywords: ["symptom", "condition", "pcos", "endometriosis", "লক্ষণ", "রোগ", "উপসর্গ"],
  },
];

const GUIDE_JOURNEYS: Record<string, JourneyKey> = {
  first_period: "first_period",
  menstrual_hygiene: "first_period",
  cloth_pad: "first_period",
  how_to_use_pad: "first_period",
  no_pad_emergency: "first_period",
  period_cramps: "period_pain",
  period_emotions: "period_pain",
  contraception: "avoid_pregnancy",
  missed_pill: "avoid_pregnancy",
  family_planning: "plan_pregnancy",
  first_pregnancy: "pregnant_now",
  after_birth: "after_birth",
  body_changes_and_puberty: "understand_symptoms",
  breast_health: "understand_symptoms",
  cervical_health: "understand_symptoms",
  sti_and_hiv_safety: "understand_symptoms",
  fertility_and_infertility: "plan_pregnancy",
  healthy_relationships_and_consent: "understand_symptoms",
  sleep_stress_and_self_care: "understand_symptoms",
  pregnancy_test_and_first_visit: "pregnant_now",
  postpartum_recovery_and_breastfeeding: "after_birth",
  emergency_contraception: "avoid_pregnancy",
  pre_eclampsia_warning_signs: "pregnant_now",
  gestational_diabetes: "pregnant_now",
  pelvic_infection_and_pain: "understand_symptoms",
};

const CONDITION_JOURNEYS: Record<string, JourneyKey[]> = {
  primary_dysmenorrhea: ["first_period", "period_pain"],
  anemia: ["understand_symptoms", "first_period", "plan_pregnancy"],
  endometriosis: ["period_pain", "understand_symptoms"],
  pcos: ["understand_symptoms", "plan_pregnancy"],
  postpartum_depression: ["after_birth", "understand_symptoms"],
};

export function getJourney(key: string | null | undefined): Journey | undefined {
  return JOURNEYS.find((journey) => journey.key === key);
}

export function guideJourney(id: string): JourneyKey | undefined {
  return GUIDE_JOURNEYS[id];
}

export function conditionJourneys(id: string): JourneyKey[] {
  return CONDITION_JOURNEYS[id] ?? ["understand_symptoms"];
}

export function guidesForJourney(id: string, key: JourneyKey): boolean {
  return guideJourney(id) === key;
}

export function conditionsForJourney(id: string, key: JourneyKey): boolean {
  return conditionJourneys(id).includes(key);
}

export function validJourney(value: unknown): JourneyKey {
  return typeof value === "string" && JOURNEY_KEYS.includes(value as JourneyKey)
    ? value as JourneyKey
    : "understand_symptoms";
}
