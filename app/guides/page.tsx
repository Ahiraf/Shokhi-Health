"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getGuides } from "@/lib/api";
import type { GuideCard } from "@/lib/types";
import PageIntro from "@/components/PageIntro";
import { EmojiIcon } from "@/components/Icon";
import { useLang } from "@/components/LanguageProvider";
import { UNIQUE_SOURCE_TOPICS, matchesSourceTopic } from "@/lib/source-topics";
import Icon from "@/components/Icon";
import JourneyPicker from "@/components/JourneyPicker";
import { getJourney, guideJourney, type JourneyKey } from "@/lib/journeys";

const CATEGORY_FILTERS = [
  { id: "all", key: "guides.categoryAll" as const },
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
  health: { bn: "স্বাস্থ্য", en: "Health" },
  adolescence: { bn: "কিশোর-কিশোরী", en: "Adolescence" },
  nutrition: { bn: "পুষ্টি", en: "Nutrition" },
  safety: { bn: "নিরাপত্তা", en: "Safety" },
  environment: { bn: "পরিবেশ", en: "Environment" },
  education: { bn: "শিক্ষা", en: "Education" },
  accessibility: { bn: "অন্তর্ভুক্তি", en: "Inclusion" },
  referrals: { bn: "সাহায্য", en: "Help" },
};

export default function GuidesPage() {
  const { t, lang } = useLang();
  const [guides, setGuides] = useState<GuideCard[]>([]);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedJourney, setSelectedJourney] = useState<JourneyKey | null>(null);

  useEffect(() => {
    getGuides().then(setGuides).catch(() => setError(true));
  }, []);

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("journey");
    setSelectedJourney(getJourney(key)?.key ?? null);
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredGuides = useMemo(() => guides.filter((guide) => {
    if (selectedJourney && guideJourney(guide.id) !== selectedJourney) return false;
    if (selectedCategory !== "all" && (guide.category ?? "health") !== selectedCategory) return false;
    if (!normalizedSearch) return true;
    return [guide.title_bn, guide.title_en, guide.summary_bn, guide.summary_en, guide.category, guide.source]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  }), [guides, normalizedSearch, selectedCategory, selectedJourney]);
  const filteredSourceTopics = useMemo(
    () => UNIQUE_SOURCE_TOPICS.filter((topic) => {
      if (selectedCategory !== "all" && selectedCategory !== "health") return false;
      if (selectedJourney && !(
        (selectedJourney === "pregnant_now" && topic.id === "pregnancy-care") ||
        (selectedJourney === "after_birth" && topic.id === "after-pregnancy") ||
        (selectedJourney === "avoid_pregnancy" && topic.id === "family-planning")
      )) return false;
      return matchesSourceTopic(topic, search);
    }),
    [search, selectedCategory, selectedJourney],
  );

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <PageIntro icon="📚" title={t("guides.title")} sub={t("guides.sub")} variant="guides" side="left" size={165} />

      <JourneyPicker page="guides" selected={selectedJourney} onSelect={setSelectedJourney} />

      <label className="relative mt-8 block">
        <span className="sr-only">{t("guides.searchLabel")}</span>
        <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-plum/40" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("guides.searchPlaceholder")}
          className="w-full rounded-2xl bg-surface/80 py-3 pl-11 pr-4 text-sm text-plum outline-none ring-1 ring-rose-soft placeholder:text-plum/40 focus:ring-2 focus:ring-rose/40"
        />
      </label>

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

      {error && (
        <p className="mt-8 text-center text-sm text-plum/50">{t("guides.error")}</p>
      )}

      {selectedJourney && (
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-rose-mist/70 px-4 py-3 text-sm text-plum/70 ring-1 ring-rose-soft">
          <span>{lang === "en" ? `Showing guides for: ${getJourney(selectedJourney)?.title_en}` : `দেখানো হচ্ছে: ${getJourney(selectedJourney)?.title_bn}`}</span>
          <Link href="/guides" className="font-semibold text-rose">{t("guides.backAll")}</Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGuides.map((g) => (
          <Link
            key={g.id}
            href={`/guides/${g.id}`}
            className="group flex flex-col rounded-2xl bg-surface/80 p-5 ring-1 ring-rose-soft transition hover:-translate-y-0.5 hover:shadow-card"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blush text-rose-deep">
              <EmojiIcon glyph={g.icon} size={22} />
            </span>
            <h2 className="mt-3 font-display text-base font-bold text-plum">
              {lang === "en" ? g.title_en || g.title_bn : g.title_bn}
            </h2>
            <span className="mt-1 text-xs font-semibold text-rose-deep">
              {(lang === "en" ? CATEGORY_LABELS[g.category ?? "health"]?.en : CATEGORY_LABELS[g.category ?? "health"]?.bn) ?? CATEGORY_LABELS.health.en}
            </span>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-plum/60">
              {lang === "en" ? g.summary_en || g.summary_bn : g.summary_bn}
            </p>
            {g.source && <p className="mt-2 text-[11px] text-plum/40">{g.source}</p>}
            <span className="mt-3 text-sm font-semibold text-rose">{t("common.read")}</span>
          </Link>
        ))}
      </div>

      {(selectedCategory === "all" || selectedCategory === "health") && <section className="mt-10">
        <div>
          <h2 className="font-display text-xl font-bold text-plum">{t("guides.sourcesTitle")}</h2>
          <p className="mt-1 text-sm text-plum/55">{t("guides.sourcesSub")}</p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSourceTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/guides/topic/${topic.id}`}
              className="group flex flex-col rounded-2xl bg-surface/80 p-5 ring-1 ring-rose-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blush text-rose-deep">
                <EmojiIcon glyph={topic.icon} size={22} />
              </span>
              <p className="mt-3 text-xs font-semibold text-rose-deep">{topic.source}</p>
              <h3 className="mt-1 font-display text-base font-bold text-plum">
                {lang === "en" ? topic.title_en : topic.title_bn}
              </h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-plum/60">
                {lang === "en" ? topic.desc_en : topic.desc_bn}
              </p>
              <span className="mt-3 text-sm font-semibold text-rose">{t("common.open")}</span>
            </Link>
          ))}
        </div>
      </section>}

      {normalizedSearch && filteredGuides.length === 0 && filteredSourceTopics.length === 0 && (
        <p className="mt-8 text-center text-sm text-plum/50">{t("guides.noResults")}</p>
      )}

      {/* the curated guides cover the common topics; anything else → ask Shokhi (RAG + chat) */}
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
