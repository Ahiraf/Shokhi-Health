"use client";

import Link from "next/link";
import PageIntro from "@/components/PageIntro";
import PersonalToday from "@/components/PersonalToday";
import WellnessTip from "@/components/WellnessTip";
import { useLang } from "@/components/LanguageProvider";

export default function TrackerTodayPage() {
  const { t, lang } = useLang();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/tracker" className="text-sm font-semibold text-rose hover:underline">
        {lang === "en" ? "← Tracker" : "← ট্র্যাকার"}
      </Link>
      <div className="mt-4">
        <PageIntro icon="✨" title={t("nav.tracker.today")} sub={lang === "en" ? "A gentle plan for today, made just for you." : "আজকের জন্য একটি মৃদু পরামর্শ, শুধু আপনার জন্য।"} variant="today" side="left" size={170} />
      </div>
      <div className="mt-8 space-y-5">
        <PersonalToday />
        <WellnessTip />
      </div>
    </main>
  );
}
