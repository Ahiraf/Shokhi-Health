"use client";

import { useLang } from "./LanguageProvider";
import GemmaPanel from "./GemmaPanel";
import { currentPhase, weeklyPhases } from "@/lib/wellness";
import { loadProfile } from "@/lib/profile";

const MOOD_LABELS: Record<string, string> = {
  great: "great", okay: "okay", low: "low", irritable: "irritable", anxious: "anxious", tearful: "tearful",
};

export default function WeeklyCompanion() {
  const { lang } = useLang();
  const en = lang === "en";
  return (
    <section className="rounded-2xl border border-rose-soft bg-surface p-4">
      <GemmaPanel
        kind="weekly"
        title={en ? "🌿 Your week with Shokhi" : "🌿 সখীর সঙ্গে আপনার সপ্তাহ"}
        cta={en ? "Plan my week" : "আমার সপ্তাহের পরিকল্পনা দিন"}
        data={() => {
          const phases = weeklyPhases();
          const moodCounts: Record<string, number> = {};
          try {
            const moods = JSON.parse(localStorage.getItem("shokhi_mood_logs") || "{}") as Record<string, string>;
            for (const mood of Object.values(moods)) moodCounts[MOOD_LABELS[mood] || mood] = (moodCounts[MOOD_LABELS[mood] || mood] || 0) + 1;
          } catch { /* local data may be empty */ }
          const phase = currentPhase();
          return {
            phase: phase.phase,
            cycleDay: phase.day,
            averageCycle: phase.cycle,
            nextSevenDays: phases.map((p) => p.phaseId),
            moodCounts,
            conditions: loadProfile().conditions ?? [],
          };
        }}
      />
    </section>
  );
}
