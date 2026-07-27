"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageIntro from "@/components/PageIntro";
import WeeklyPlan from "@/components/WeeklyPlan";
import MoveVisual from "@/components/MoveVisual";
import Icon from "@/components/Icon";
import { useLang } from "@/components/LanguageProvider";
import { getWellness } from "@/lib/api";
import type { Wellness } from "@/lib/types";

const COMPANIONS = [
  {
    href: "/tracker/today",
    icon: "✨",
    title: { en: "For you today", bn: "আজকের জন্য" },
    body: { en: "A gentle personal note from your cycle, mood, and local context.", bn: "আপনার চক্র, মন আর নিজের তথ্য থেকে আজকের কোমল পরামর্শ।" },
  },
  {
    href: "/tracker/mood",
    icon: "🫂",
    title: { en: "Mood & feelings", bn: "মন ও অনুভূতি" },
    body: { en: "Notice how you feel and create a kinder conversation with family.", bn: "মন কেমন খেয়াল করুন, পরিবারকে বোঝাতেও সাহায্য নিন।" },
  },
] as const;

export default function WellnessPage() {
  const { t, lang } = useLang();
  const [w, setW] = useState<Wellness | null>(null);
  const [error, setError] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pick = (o: any, base: string): string =>
    (lang === "en" ? o[`${base}_en`] : "") || o[`${base}_bn`];

  useEffect(() => {
    getWellness().then(setW).catch(() => setError(true));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <PageIntro icon="🌿" title={t("wellness.title")} sub={t("wellness.sub")} variant="wellness" side="left" size={165} />

      {error && <p className="mt-8 text-center text-sm text-plum/50">{t("wellness.error")}</p>}

      {w && (
        <div className="mt-8 space-y-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[15px] leading-relaxed text-plum/70">{pick(w, "intro")}</p>
          </div>

          {/* personalized 7-day plan */}
          <WeeklyPlan />

          {/* by cycle phase */}
          <section>
            <h2 className="font-display text-xl font-bold text-plum">{t("wellness.byPhase")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {w.phases.map((p) => (
                <div key={p.id} className="rounded-2xl bg-surface/80 p-5 ring-1 ring-rose-soft">
                  <div>
                    <p className="font-display text-base font-bold text-plum">{pick(p, "label")}</p>
                  </div>
                  <p className="text-xs text-plum/45">{pick(p, "days")}</p>
                  <p className="mt-3 text-sm leading-relaxed text-plum/80">
                    <span className="font-semibold text-rose-deep">{t("wellness.move")}</span> — {pick(p, "move")}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-plum/80">
                    <span className="font-semibold text-sage-deep">{t("wellness.food")}</span> — {pick(p, "food")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* by condition */}
          <section>
            <h2 className="font-display text-xl font-bold text-plum">{t("wellness.forConditions")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {w.conditions.map((c) => (
                <div key={c.id} className="rounded-2xl bg-blush/50 p-5 ring-1 ring-rose-soft">
                  <div>
                    <p className="font-display text-base font-bold text-plum">{pick(c, "label")}</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-plum/80">
                    <span className="font-semibold text-rose-deep">{t("wellness.move")}</span> — {pick(c, "move")}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-plum/80">
                    <span className="font-semibold text-sage-deep">{t("wellness.food")}</span> — {pick(c, "food")}
                  </p>
                  <p className="mt-3 rounded-xl bg-surface/70 px-3 py-2 text-xs leading-relaxed text-plum/60">
                    🩺 {pick(c, "note")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* simple home moves */}
          <section>
            <h2 className="font-display text-xl font-bold text-plum">{t("wellness.movesTitle")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {w.moves.map((m) => (
                <Link
                  key={m.id}
                  href={`/wellness/move/${m.id}`}
                  className="group flex items-center gap-3 rounded-2xl bg-surface/80 p-4 ring-1 ring-rose-soft transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sage-soft text-3xl">
                    <MoveVisual id={m.id} icon={m.icon} size={60} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold text-plum">{pick(m, "name")}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-plum/65">{pick(m, "how")}</p>
                  </div>
                  <Icon name="chevron" size={18} className="shrink-0 text-rose-deep/50 transition group-hover:translate-x-0.5 group-hover:text-rose-deep" />
                </Link>
              ))}
            </div>
          </section>

          {/* personal companion panel — daily plan and mood now belong with Wellness */}
          <section className="rounded-3xl bg-gradient-to-br from-panel to-panel-deep p-5 text-white shadow-card sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{lang === "en" ? "Your companions" : "আপনার সঙ্গী"}</p>
                <h2 className="mt-1 font-display text-xl font-bold">{lang === "en" ? "Small check-ins for every day" : "প্রতিদিনের ছোট্ট যত্ন"}</h2>
              </div>
              <span className="text-2xl" aria-hidden>✦</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {COMPANIONS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  <span className="text-xl" aria-hidden>{item.icon}</span>
                  <h3 className="mt-2 font-display font-bold text-white">{lang === "en" ? item.title.en : item.title.bn}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{lang === "en" ? item.body.en : item.body.bn}</p>
                  <span className="mt-3 inline-block text-xs font-semibold text-white/80 transition group-hover:translate-x-0.5">{lang === "en" ? "Open →" : "খুলুন →"}</span>
                </Link>
              ))}
            </div>
          </section>

          <p className="rounded-2xl bg-apricot-soft/60 px-4 py-3.5 text-xs leading-relaxed text-plum/60">
            ℹ️ {pick(w, "disclaimer")}
          </p>
        </div>
      )}
    </main>
  );
}
