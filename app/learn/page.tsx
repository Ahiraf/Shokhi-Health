"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getKnowledge } from "@/lib/api";
import type { Condition } from "@/lib/types";
import PageIntro from "@/components/PageIntro";
import { useLang } from "@/components/LanguageProvider";
import type { StringKey } from "@/lib/i18n";
import Icon from "@/components/Icon";
import JourneyPicker from "@/components/JourneyPicker";
import { conditionJourneys, getJourney, type JourneyKey, conditionsForJourney } from "@/lib/journeys";

const URGENCY_TAG: Record<string, { key: StringKey; cls: string }> = {
  emergency: { key: "urgency.emergency.short", cls: "bg-red-100 text-red-700" },
  see_doctor_soon: { key: "urgency.see_doctor_soon.short", cls: "bg-amber-100 text-amber-800" },
  self_care: { key: "urgency.self_care.short", cls: "bg-sage-soft text-sage-deep" },
  info: { key: "urgency.info.short", cls: "bg-blush text-rose-deep" },
};

export default function LearnPage() {
  const { t, lang } = useLang();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedJourney, setSelectedJourney] = useState<JourneyKey | null>(null);

  useEffect(() => {
    getKnowledge().then((k) => setConditions(k.conditions)).catch(() => setError(true));
  }, []);

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("journey");
    setSelectedJourney(getJourney(key)?.key ?? null);
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredConditions = useMemo(() => conditions.filter((condition) => {
    if (selectedJourney && !conditionsForJourney(condition.id, selectedJourney)) return false;
    if (!normalizedSearch) return true;
    return [condition.name_bn, condition.name_en, condition.about_bn, condition.about_en, ...conditionJourneys(condition.id)]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  }), [conditions, normalizedSearch, selectedJourney]);
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <PageIntro icon="🧠" title={t("learn.title")} sub={t("learn.sub")} variant="learn" side="left" size={165} />

      <JourneyPicker page="learn" selected={selectedJourney} onSelect={setSelectedJourney} />

      <label className="relative mt-8 block">
        <span className="sr-only">{t("learn.searchLabel")}</span>
        <Icon name="search" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-plum/40" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("learn.searchPlaceholder")}
          className="w-full rounded-2xl bg-surface/80 py-3 pl-11 pr-4 text-sm text-plum outline-none ring-1 ring-rose-soft placeholder:text-plum/40 focus:ring-2 focus:ring-rose/40"
        />
      </label>

      {error && <p className="mt-8 text-center text-sm text-plum/50">{t("learn.error")}</p>}

      {selectedJourney && (
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-rose-mist/70 px-4 py-3 text-sm text-plum/70 ring-1 ring-rose-soft">
          <span>{lang === "en" ? `Showing topics for: ${getJourney(selectedJourney)?.title_en}` : `দেখানো হচ্ছে: ${getJourney(selectedJourney)?.title_bn}`}</span>
          <Link href="/learn" className="font-semibold text-rose">{t("learn.backAll")}</Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {filteredConditions.map((c) => {
          const tag = URGENCY_TAG[c.urgency ?? "info"] ?? URGENCY_TAG.info;
          return (
            <Link
              key={c.id}
              href={`/learn/${c.id}`}
              className="group flex flex-col rounded-2xl bg-surface/80 p-5 ring-1 ring-rose-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-base font-bold text-plum">
                  {lang === "en" ? c.name_en || c.name_bn : c.name_bn}
                </h2>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tag.cls}`}>
                  {t(tag.key)}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-plum/60 line-clamp-3">
                {lang === "en" ? c.about_en || c.about_bn : c.about_bn}
              </p>
              <span className="mt-3 text-sm font-semibold text-rose">{t("common.details")}</span>
            </Link>
          );
        })}
      </div>

      {selectedJourney && filteredConditions.length === 0 && (
        <div className="mt-8 rounded-2xl bg-blush/70 px-5 py-5 text-center">
          <p className="text-sm leading-relaxed text-plum/75">
            {lang === "en"
              ? "This situation is mostly about practical next steps rather than a condition. See the short guides for it."
              : "এই পরিস্থিতিতে রোগের তালিকার চেয়ে কী করবেন তা জানা বেশি দরকার। ছোট গাইডগুলো দেখুন।"}
          </p>
          <Link href={`/guides?journey=${selectedJourney}`} className="mt-3 inline-block rounded-full bg-rose px-5 py-2 text-sm font-semibold text-accentink">
            {lang === "en" ? "Open the practical guides" : "ব্যবহারিক গাইড দেখুন"}
          </Link>
        </div>
      )}

      {normalizedSearch && filteredConditions.length === 0 && (
        <p className="mt-8 text-center text-sm text-plum/50">{t("learn.noResults")}</p>
      )}

      {/* curated conditions cover the common ones; the chat handles anything else */}
      <div className="mt-8 rounded-2xl bg-blush/70 px-5 py-5 text-center">
        <p className="text-sm text-plum/75">
          {lang === "en" ? "Worried about something not listed here? Describe it to Shokhi in Bangla." : "এখানে নেই এমন কিছু নিয়ে চিন্তিত? সখীকে বাংলায় বলুন।"}
        </p>
        <Link href="/chat" className="mt-2 inline-block rounded-full bg-rose px-5 py-2 text-sm font-semibold text-accentink">
          {t("common.askShokhi")}
        </Link>
      </div>
    </main>
  );
}
