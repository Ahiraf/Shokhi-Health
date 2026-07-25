"use client";

import { useLang } from "./LanguageProvider";
import GemmaPanel from "./GemmaPanel";
import { currentPhase } from "@/lib/wellness";
import { loadProfile } from "@/lib/profile";
import { fromDays, todayDays } from "@/lib/cycle-insights";

/** "For you today" — a personalised Gemma note from her cycle phase + today's mood + conditions. */
export default function PersonalToday() {
  const { lang } = useLang();
  const en = lang === "en";
  return (
    <div className="rounded-2xl border border-rose-soft bg-surface p-4">
      <GemmaPanel
        kind="today"
        title={en ? "✨ For you today" : "✨ আজকের জন্য"}
        cta={en ? "Write my note for today" : "আজকের পরামর্শ লিখুন"}
        data={() => {
          const { phase, day } = currentPhase();
          let mood: string | undefined;
          try {
            mood = JSON.parse(localStorage.getItem("shokhi_mood_logs") || "{}")[fromDays(todayDays())];
          } catch { /* ignore */ }
          const conditions = loadProfile().conditions ?? [];
          return { phase, cycleDay: day, mood, conditions };
        }}
      />
    </div>
  );
}
