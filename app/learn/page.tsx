"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getGuides, getKnowledge } from "@/lib/api";
import type { Condition, GuideCard } from "@/lib/types";
import type { SourceTopic } from "@/lib/source-topics";
import { UNIQUE_SOURCE_TOPICS, matchesSourceTopic, SOURCE_GUIDE_IDS } from "@/lib/source-topics";
import { conditionJourneys, getJourney, guideJourney, type JourneyKey, conditionsForJourney } from "@/lib/journeys";
import PageIntro from "@/components/PageIntro";
import { useLang } from "@/components/LanguageProvider";
import Icon from "@/components/Icon";
import type { StringKey } from "@/lib/i18n";
import { mascotImageFor } from "@/lib/mascot-images";

const URGENCY_TAG: Record<string, { key: StringKey; cls: string }> = {
  emergency: { key: "urgency.emergency.short", cls: "bg-red-100 text-red-700" },
  see_doctor_soon: { key: "urgency.see_doctor_soon.short", cls: "bg-amber-100 text-amber-800" },
  self_care: { key: "urgency.self_care.short", cls: "bg-sage-soft text-sage-deep" },
  info: { key: "urgency.info.short", cls: "bg-blush text-rose-deep" },
};

const CATEGORY_FILTERS = [
  { id: "all", key: "guides.categoryAll" as const },
  { id: "conditions", key: "guides.categoryConditions" as const },
  { id: "health", key: "guides.categoryHealth" as const },
  { id: "adolescence", key: "guides.categoryAdolescence" as const },
  { id: "nutrition", key: "guides.categoryNutrition" as const },
  { id: "safety", key: "guides.categorySafety" as const },
  { id: "environment", key: "guides.categoryEnvironment" as const },
  { id: "education", key: "guides.categoryEducation" as const },
  { id: "accessibility", key: "guides.categoryAccessibility" as const },
  { id: "referrals", key: "guides.categoryReferrals" as const },
] as const;

const CATEGORY_LABELS: Record<string, { bn: string; en: string }> = {
  conditions: { bn: "রোগ ও উপসর্গ", en: "Conditions" },
  health: { bn: "স্বাস্থ্য", en: "Health" },
  adolescence: { bn: "কিশোর-কিশোরী", en: "Adolescence" },
  nutrition: { bn: "পুষ্টি", en: "Nutrition" },
  safety: { bn: "নিরাপত্তা", en: "Safety" },
  environment: { bn: "পরিবেশ", en: "Environment" },
  education: { bn: "শিক্ষা", en: "Education" },
  accessibility: { bn: "অন্তর্ভুক্তি", en: "Inclusion" },
  referrals: { bn: "সাহায্য", en: "Help" },
};

// Search results use the same illustrations as the 15-topic shelf, so every card
// has a visual cue without creating another copy of the illustrated topic section.
type LibraryItem =
  | { kind: "condition"; condition: Condition }
  | { kind: "guide"; guide: GuideCard }
  | { kind: "source"; topic: SourceTopic };

function sourceTopicMatchesJourney(topic: SourceTopic, journey: JourneyKey): boolean {
  if (journey === "pregnant_now") return topic.id === "pregnancy-care";
  if (journey === "after_birth") return topic.id === "after-pregnancy";
  if (journey === "avoid_pregnancy") return topic.id === "family-planning";
  return true;
}

export default function LearnPage() {
  const { t, lang } = useLang();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [guides, setGuides] = useState<GuideCard[]>([]);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedJourney, setSelectedJourney] = useState<JourneyKey | null>(null);

  useEffect(() => {
    getKnowledge()
      .then((knowledge) => setConditions(knowledge.conditions))
      .catch(() => setError(true));
    getGuides()
      .then(setGuides)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("journey");
    setSelectedJourney(getJourney(key)?.key ?? null);
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const items = useMemo<LibraryItem[]>(() => {
    const conditionItems: LibraryItem[] = conditions
      .filter((condition) => {
        // Period cramps has a richer illustrated guide and self-check below.
        if (condition.id === "primary_dysmenorrhea") return false;
        if (selectedCategory !== "all" && selectedCategory !== "conditions") return false;
        if (selectedJourney && !conditionsForJourney(condition.id, selectedJourney)) return false;
        if (!normalizedSearch) return true;
        return [condition.name_bn, condition.name_en, condition.about_bn, condition.about_en, ...conditionJourneys(condition.id)]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      })
      .map((condition) => ({ kind: "condition" as const, condition }));

    const guideItems: LibraryItem[] = guides
      .filter((guide) => {
        // Illustrated guides are surfaced in the topic shelf above. Keeping them out
        // of this second grid prevents the same 15 cards from appearing twice.
        if (guide.image) return false;
        const category = guide.category ?? "health";
        if (selectedCategory !== "all" && selectedCategory !== category) return false;
        if (selectedJourney && guideJourney(guide.id) !== selectedJourney) return false;
        if (!normalizedSearch) return true;
        return [guide.title_bn, guide.title_en, guide.summary_bn, guide.summary_en, category, guide.source, ...(guide.keywords ?? [])]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      })
      .map((guide) => ({ kind: "guide" as const, guide }));

    const sourceItems: LibraryItem[] = UNIQUE_SOURCE_TOPICS
      .filter((topic) => {
        if (selectedCategory !== "all" && selectedCategory !== "health") return false;
        if (selectedJourney && !sourceTopicMatchesJourney(topic, selectedJourney)) return false;
        return matchesSourceTopic(topic, search);
      })
      .map((topic) => ({ kind: "source" as const, topic }));

    return [...conditionItems, ...guideItems, ...sourceItems];
  }, [conditions, guides, normalizedSearch, search, selectedCategory, selectedJourney]);

  const mascotGuides = useMemo(() => guides.filter((guide) => {
    if (!guide.image) return false;
    const category = guide.category ?? "health";
    if (selectedCategory !== "all" && selectedCategory !== category) return false;
    if (selectedJourney) {
      const journey = guideJourney(guide.id);
      if (journey && journey !== selectedJourney) return false;
      if (!journey && selectedJourney !== "understand_symptoms") return false;
    }
    if (!normalizedSearch) return true;
    return [guide.title_bn, guide.title_en, guide.summary_bn, guide.summary_en, category, guide.source, ...(guide.keywords ?? [])]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  }), [guides, normalizedSearch, selectedCategory, selectedJourney]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <PageIntro icon="🧠" title={t("learn.title")} sub={t("learn.sub")} variant="learn" side="left" size={165} />

      <label className="relative mt-6 block">
        <span className="sr-only">{t("learn.searchLabel")}</span>
        <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-plum/40" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("learn.searchPlaceholder")}
          className="w-full rounded-2xl bg-surface/80 py-3 pl-11 pr-4 text-sm text-plum outline-none ring-1 ring-rose-soft placeholder:text-plum/40 focus:ring-2 focus:ring-rose/40"
        />
      </label>

      {mascotGuides.length > 0 && (
        <section className="mt-6 rounded-3xl bg-panel/95 p-4 text-white shadow-card sm:p-5" aria-labelledby="illustrated-topics-heading">
          <div>
            <p id="illustrated-topics-heading" className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
              {lang === "en" ? "Learn by topic" : "বিষয় ধরে শিখুন"}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {lang === "en" ? "Choose a topic to open a simple, trusted guide." : "যে কোনো বিষয় বেছে সহজ ও নির্ভরযোগ্য গাইড পড়ুন।"}
            </p>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {mascotGuides.map((guide) => (
              <Link
                key={`mascot-${guide.id}`}
                href={`/guides/${guide.id}`}
                className="group flex min-h-[4.8rem] items-center gap-3 rounded-2xl bg-white/10 p-2.5 transition hover:-translate-y-0.5 hover:bg-white/16"
              >
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-rose-mist">
                  <Image src={guide.image!} alt="" fill sizes="64px" className="object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-snug text-white">
                    {lang === "en" ? guide.title_en || guide.title_bn : guide.title_bn}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-white/60 line-clamp-2">
                    {lang === "en" ? guide.summary_en || guide.summary_bn : guide.summary_bn}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4" aria-label={t("guides.filterLabel")}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-plum/45">{t("guides.filterLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={selectedCategory === category.id
                ? "rounded-full bg-rose px-3 py-1.5 text-xs font-semibold text-accentink"
                : "rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-plum/65 ring-1 ring-rose-soft hover:bg-blush"}
            >
              {t(category.key)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-8 text-center text-sm text-plum/50">{t("learn.error")}</p>}

      {selectedJourney && (
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-rose-mist/70 px-4 py-3 text-sm text-plum/70 ring-1 ring-rose-soft">
          <span>{lang === "en" ? `Showing topics for: ${getJourney(selectedJourney)?.title_en}` : `দেখানো হচ্ছে: ${getJourney(selectedJourney)?.title_bn}`}</span>
          <Link href="/learn" className="font-semibold text-rose">{t("learn.backAll")}</Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          if (item.kind === "condition") {
            const { condition } = item;
            const tag = URGENCY_TAG[condition.urgency ?? "info"] ?? URGENCY_TAG.info;
            return (
              <Link
                key={`condition-${condition.id}`}
                href={`/learn/${condition.id}`}
                className="group flex flex-col rounded-2xl bg-surface/80 p-5 ring-1 ring-rose-soft transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-blush">
                    <Image src={mascotImageFor(condition.id)} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-base font-bold text-plum">
                        {lang === "en" ? condition.name_en || condition.name_bn : condition.name_bn}
                      </h2>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tag.cls}`}>
                        {t(tag.key)}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="mt-2 text-xs font-semibold text-rose-deep">{CATEGORY_LABELS.conditions[lang]}</span>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-plum/60 line-clamp-3">
                  {lang === "en" ? condition.about_en || condition.about_bn : condition.about_bn}
                </p>
                <span className="mt-3 text-sm font-semibold text-rose">{t("common.details")}</span>
              </Link>
            );
          }

          if (item.kind === "guide") {
            const { guide } = item;
            const category = guide.category ?? "health";
            return (
              <Link
                key={`guide-${guide.id}`}
                href={`/guides/${guide.id}`}
                className="group flex flex-col rounded-2xl bg-surface/80 p-5 ring-1 ring-rose-soft transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="relative block h-24 w-full overflow-hidden rounded-xl bg-blush">
                  <Image src={guide.image ?? mascotImageFor(guide.id)} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                </span>
                <h2 className="mt-3 font-display text-base font-bold text-plum">
                  {lang === "en" ? guide.title_en || guide.title_bn : guide.title_bn}
                </h2>
                <span className="mt-1 text-xs font-semibold text-rose-deep">
                  {CATEGORY_LABELS[category]?.[lang] ?? CATEGORY_LABELS.health[lang]}
                </span>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-plum/60">
                  {lang === "en" ? guide.summary_en || guide.summary_bn : guide.summary_bn}
                </p>
                {guide.source && <p className="mt-2 text-[11px] text-plum/40">{guide.source}</p>}
                <span className="mt-3 text-sm font-semibold text-rose">{t("common.read")}</span>
              </Link>
            );
          }

          const { topic } = item;
          return (
            <Link
              key={`source-${topic.id}`}
              href={SOURCE_GUIDE_IDS[topic.id] ? `/guides/${SOURCE_GUIDE_IDS[topic.id]}` : `/guides/topic/${topic.id}`}
              className="group flex flex-col rounded-2xl bg-surface/80 p-5 ring-1 ring-rose-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <span className="relative block h-24 w-full overflow-hidden rounded-xl bg-blush">
                <Image src={mascotImageFor(topic.id)} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
              </span>
              <p className="mt-3 text-xs font-semibold text-rose-deep">{topic.source}</p>
              <h2 className="mt-1 font-display text-base font-bold text-plum">
                {lang === "en" ? topic.title_en : topic.title_bn}
              </h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-plum/60">
                {lang === "en" ? topic.desc_en : topic.desc_bn}
              </p>
              <span className="mt-3 text-sm font-semibold text-rose">{t("common.open")}</span>
            </Link>
          );
        })}
      </div>

      {normalizedSearch && items.length === 0 && mascotGuides.length === 0 && (
        <p className="mt-8 text-center text-sm text-plum/50">{t("guides.noResults")}</p>
      )}

      <div className="mt-8 rounded-2xl bg-blush/70 px-5 py-5 text-center">
        <p className="text-sm text-plum/75">
          {lang === "en" ? "Can't find your topic here? Ask Shokhi anything in Bangla." : "আপনার বিষয় এখানে নেই? সখীকে বাংলায় যেকোনো প্রশ্ন করুন।"}
        </p>
        <Link href="/chat" className="mt-2 inline-block rounded-full bg-rose px-5 py-2 text-sm font-semibold text-accentink">
          {t("common.askShokhi")}
        </Link>
      </div>
    </main>
  );
}
