"use client";

import Link from "next/link";
import PageIntro from "@/components/PageIntro";
import CycleTracker from "@/components/CycleTracker";
import Icon from "@/components/Icon";
import { useLang } from "@/components/LanguageProvider";
import type { StringKey } from "@/lib/i18n";

// Tracker's focused companion tool; personal daily/mood pages now live under Wellness.
const MORE: { href: string; key: StringKey; icon: "sparkle" | "heart" | "clock" }[] = [
  { href: "/tracker/reminder", key: "nav.tracker.pad", icon: "clock" },
];

export default function TrackerPage() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <PageIntro icon="🩸" title={t("tracker.title")} sub={t("tracker.sub")} variant="tracker" side="left" size={140} />
      <CycleTracker />

      {/* jump to the tracker's supporting reminder */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {MORE.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex items-center gap-2.5 rounded-2xl border border-rose-soft bg-surface p-3 transition hover:-translate-y-0.5 hover:shadow-card"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-soft text-rose-deep">
              <Icon name={m.icon} size={18} />
            </span>
            <span className="flex-1 text-sm font-semibold text-plum">{t(m.key)}</span>
            <Icon name="chevron" size={16} className="text-rose-deep/50 transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </main>
  );
}
