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

export default function GuidesPage() {
  const { t, lang } = useLang();
  const [guides, setGuides] = useState<GuideCard[]>([]);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getGuides().then(setGuides).catch(() => setError(true));
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredGuides = useMemo(() => guides.filter((guide) => {
    if (!normalizedSearch) return true;
    return [guide.title_bn, guide.title_en, guide.summary_bn, guide.summary_en]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  }), [guides, normalizedSearch]);
  const filteredSourceTopics = useMemo(
    () => UNIQUE_SOURCE_TOPICS.filter((topic) => matchesSourceTopic(topic, search)),
    [search],
  );

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <PageIntro icon="📚" title={t("guides.title")} sub={t("guides.sub")} variant="guides" side="left" size={165} />

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

      {error && (
        <p className="mt-8 text-center text-sm text-plum/50">{t("guides.error")}</p>
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
            <p className="mt-1 flex-1 text-sm leading-relaxed text-plum/60">
              {lang === "en" ? g.summary_en || g.summary_bn : g.summary_bn}
            </p>
            <span className="mt-3 text-sm font-semibold text-rose">{t("common.read")}</span>
          </Link>
        ))}
      </div>

      <section className="mt-10">
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
      </section>

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
