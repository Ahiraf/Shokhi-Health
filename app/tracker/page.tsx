"use client";

import Link from "next/link";
import PageIntro from "@/components/PageIntro";
import CycleTracker from "@/components/CycleTracker";
import PadReminder from "@/components/PadReminder";
import WellnessTip from "@/components/WellnessTip";
import MoodLog from "@/components/MoodLog";
import FamilyCard from "@/components/FamilyCard";
import PersonalToday from "@/components/PersonalToday";
import Icon from "@/components/Icon";
import { useLang } from "@/components/LanguageProvider";

export default function TrackerPage() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <PageIntro icon="🩸" title={t("tracker.title")} sub={t("tracker.sub")} variant="tracker" side="left" size={140} />
      <CycleTracker />
      <div className="mt-5 space-y-5">
        <PersonalToday />
        <MoodLog />
        <FamilyCard />

        {/* entry point to the report explainer (lives under the tracker, not the top nav) */}
        <Link
          href="/report"
          className="group flex items-center gap-3 rounded-2xl border border-rose-soft bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-card"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-soft text-rose-deep">
            <Icon name="health" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-plum">{t("tracker.reportTitle")}</p>
            <p className="mt-0.5 text-sm text-plum/60">{t("tracker.reportSub")}</p>
          </div>
          <Icon name="chevron" size={18} className="shrink-0 text-rose-deep/50 transition group-hover:translate-x-0.5 group-hover:text-rose-deep" />
        </Link>
      </div>
      <WellnessTip />
      <PadReminder />
    </main>
  );
}
