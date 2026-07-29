import { getInsights } from "./cycle-insights";
import type { CycleLog } from "./types";
import type { Profile } from "./profile";

// Deliberately small and non-identifying. This context is sent only when the user asks
// Shokhi for help; names, notes, and raw period dates stay on the device.
export interface PersonalizationContext {
  profile?: {
    age?: number;
    lifeStage?: string;
    conditions?: string[];
  };
  cycle?: {
    loggedPeriods?: number;
    averageCycleLength?: number;
    regular?: boolean;
    cycleDay?: number;
    phase?: string;
    daysUntilNext?: number;
    recentPain?: number;
    recentFlow?: string;
    recentHeavyBleeding?: boolean;
  };
}

function readLocalLogs(): CycleLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem("shokhi_cycle_logs") || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is CycleLog => {
      if (!item || typeof item !== "object") return false;
      const value = item as Record<string, unknown>;
      return typeof value.start === "string" && /^\d{4}-\d{2}-\d{2}/.test(value.start);
    }).slice(-60);
  } catch {
    return [];
  }
}

export function buildPersonalizationContext(profile: Profile): PersonalizationContext {
  const context: PersonalizationContext = { profile: {} };
  if (typeof profile.age === "number" && profile.age > 0 && profile.age <= 120) context.profile!.age = profile.age;
  if (profile.stage) context.profile!.lifeStage = profile.stage;
  if (Array.isArray(profile.conditions) && profile.conditions.length) {
    context.profile!.conditions = profile.conditions.slice(0, 8);
  }
  if (!Object.keys(context.profile!).length) delete context.profile;

  const logs = readLocalLogs();
  if (!logs.length) return context;
  const insights = getInsights(logs);
  const latest = [...logs].sort((a, b) => b.start.localeCompare(a.start))[0];
  context.cycle = {
    loggedPeriods: insights.analysis.logged_count,
    averageCycleLength: Number.isFinite(insights.avgCycle) ? insights.avgCycle : undefined,
    regular: insights.analysis.regular ?? undefined,
    cycleDay: insights.cycleDay ?? undefined,
    phase: insights.phase ?? undefined,
    daysUntilNext: insights.daysUntilNext ?? undefined,
    recentPain: typeof latest.pain === "number" ? latest.pain : undefined,
    recentFlow: latest.flow,
    recentHeavyBleeding: latest.flow === "heavy" || (latest.pads ?? 0) >= 6,
  };
  return context;
}
