"use client";

import Link from "next/link";
import PageIntro from "@/components/PageIntro";
import MoodLog from "@/components/MoodLog";
import FamilyCard from "@/components/FamilyCard";
import { useLang } from "@/components/LanguageProvider";

export default function TrackerMoodPage() {
  const { t, lang } = useLang();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/tracker" className="text-sm font-semibold text-rose hover:underline">
        {lang === "en" ? "← Tracker" : "← ট্র্যাকার"}
      </Link>
      <div className="mt-4">
        <PageIntro icon="🫂" title={t("nav.tracker.mood")} sub={lang === "en" ? "Track how you feel, and help your family understand." : "মন কেমন লিখুন, আর পরিবারকে বুঝতে সাহায্য করুন।"} variant="mood" side="left" size={140} />
      </div>
      <div className="mt-8 space-y-5">
        <MoodLog />
        <FamilyCard />
      </div>
    </main>
  );
}
