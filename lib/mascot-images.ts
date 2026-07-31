// User-provided topic illustrations. Keeping the mapping in one place makes it easy to
// replace an illustration without changing guide content or page layout.

export const GUIDE_MASCOT_IMAGES: Record<string, string> = {
  adolescent_wellbeing: "/Adolescent Wellbeing.png",
  child_protection: "/Child Protection.png",
  nutrition_for_families: "/Nutrition.png",
  water_hygiene: "/Water and Hygiene.png",
  climate_disaster_safety: "/Climate and disasters.png",
  education_and_digital_skills: "/Education and digital safety.png",
  disability_inclusion: "/disability inclusion.png",
  mental_wellbeing: "/Mental Wellbeing.png",
  safe_help: "/General Symptom check.png",
  first_period: "/First Period.png",
  period_cramps: "/Period Cramps.png",
  contraception: "/Contraception.png",
  family_planning: "/Family Planning.png",
  first_pregnancy: "/First Pregnency.png",
  after_birth: "/After Birth.png",
};

export const JOURNEY_MASCOT_IMAGES: Record<string, string> = {
  first_period: "/First Period.png",
  period_pain: "/Period Cramps.png",
  avoid_pregnancy: "/Contraception.png",
  plan_pregnancy: "/Family Planning.png",
  pregnant_now: "/First Pregnency.png",
  after_birth: "/After Birth.png",
};

// Reuse the same 15 topic illustrations on condition and source-result cards/pages.
// This keeps a topic visually consistent from the library through its detail view.
export const RELATED_MASCOT_IMAGES: Record<string, string> = {
  pcos: GUIDE_MASCOT_IMAGES.mental_wellbeing,
  "pcos-care": GUIDE_MASCOT_IMAGES.mental_wellbeing,
  endometriosis: GUIDE_MASCOT_IMAGES.period_cramps,
  "endometriosis-care": GUIDE_MASCOT_IMAGES.period_cramps,
  primary_dysmenorrhea: GUIDE_MASCOT_IMAGES.period_cramps,
  pms: GUIDE_MASCOT_IMAGES.period_cramps,
  anemia: GUIDE_MASCOT_IMAGES.nutrition_for_families,
  menopause: GUIDE_MASCOT_IMAGES.mental_wellbeing,
  "menopause-care": GUIDE_MASCOT_IMAGES.mental_wellbeing,
  postpartum_depression: GUIDE_MASCOT_IMAGES.after_birth,
  uti: GUIDE_MASCOT_IMAGES.safe_help,
  vaginal_infection: GUIDE_MASCOT_IMAGES.safe_help,
  "menstrual-health": GUIDE_MASCOT_IMAGES.period_cramps,
  "pregnancy-care": GUIDE_MASCOT_IMAGES.first_pregnancy,
  "family-planning": GUIDE_MASCOT_IMAGES.family_planning,
  "after-pregnancy": GUIDE_MASCOT_IMAGES.after_birth,
  "menstrual-regulation": GUIDE_MASCOT_IMAGES.safe_help,
  "hiv-services": GUIDE_MASCOT_IMAGES.safe_help,
  period_emotions: GUIDE_MASCOT_IMAGES.period_cramps,
  missed_pill: GUIDE_MASCOT_IMAGES.contraception,
  nutrition_anemia: GUIDE_MASCOT_IMAGES.nutrition_for_families,
  menstrual_hygiene: GUIDE_MASCOT_IMAGES.first_period,
  cloth_pad: GUIDE_MASCOT_IMAGES.first_period,
  how_to_use_pad: GUIDE_MASCOT_IMAGES.first_period,
  no_pad_emergency: GUIDE_MASCOT_IMAGES.first_period,
  emergency_contraception: GUIDE_MASCOT_IMAGES.contraception,
  pre_eclampsia_warning_signs: GUIDE_MASCOT_IMAGES.first_pregnancy,
  gestational_diabetes: GUIDE_MASCOT_IMAGES.first_pregnancy,
  pelvic_infection_and_pain: GUIDE_MASCOT_IMAGES.safe_help,
};

export function mascotImageFor(id: string): string {
  // Guide cards use GUIDE_MASCOT_IMAGES directly. Prefer that same mapping on detail
  // pages, then fall back to the shared condition/source mapping for related topics.
  return GUIDE_MASCOT_IMAGES[id] ?? RELATED_MASCOT_IMAGES[id] ?? GUIDE_MASCOT_IMAGES.safe_help;
}
