"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PadReminder from "@/components/PadReminder";
import { useLang } from "@/components/LanguageProvider";

export default function TrackerReminderPage() {
  const { t, lang } = useLang();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/tracker" className="text-sm font-semibold text-rose hover:underline">
        {lang === "en" ? "← Tracker" : "← ট্র্যাকার"}
      </Link>
      <div className="mt-4">
        <PageHeader icon="⏰" title={t("nav.tracker.pad")} sub={lang === "en" ? "A gentle nudge to change your pad every 4–6 hours." : "প্রতি ৪–৬ ঘণ্টায় প্যাড বদলানোর মৃদু মনে করানো।"} />
      </div>
      <div className="mt-8">
        <PadReminder />
      </div>
    </main>
  );
}
