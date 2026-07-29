import { NextResponse } from "next/server";
import type { PersonalizationContext } from "@/lib/personalization";

export type JsonBody = Record<string, unknown>;

export const MAX_MESSAGE_LENGTH = 2_000;
export const MAX_HISTORY_ITEMS = 20;
export const MAX_HISTORY_ITEM_LENGTH = 2_000;
export const MAX_TOPIC_LENGTH = 200;
export const MAX_BELIEF_LENGTH = 1_000;
export const MAX_CYCLE_LOGS = 200;

export async function readJson(req: Request): Promise<JsonBody | null> {
  try {
    const value: unknown = await req.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as JsonBody;
  } catch {
    return null;
  }
}

export function readText(body: JsonBody, key: string, maxLength: number, required = false): string | null {
  const value = body[key];
  if (typeof value !== "string") return required ? null : "";
  const text = value.trim();
  if (required && !text) return null;
  if (text.length > maxLength) return null;
  return text;
}

export function readLanguage(value: unknown): "bn" | "en" {
  return value === "en" ? "en" : "bn";
}

export function readHistory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => item.trim().slice(0, MAX_HISTORY_ITEM_LENGTH))
    .filter(Boolean);
}

export function readProfile(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const profile: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 100)) {
    if (typeof item === "boolean" || typeof item === "number" || typeof item === "string") {
      profile[key] = item;
    }
  }
  return profile;
}

/** Accept only the bounded, non-identifying recommendation context built on the device. */
export function readPersonalization(value: unknown): PersonalizationContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const out: PersonalizationContext = {};
  const profile = input.profile;
  if (profile && typeof profile === "object" && !Array.isArray(profile)) {
    const p = profile as Record<string, unknown>;
    const safe: NonNullable<PersonalizationContext["profile"]> = {};
    if (typeof p.age === "number" && Number.isInteger(p.age) && p.age > 0 && p.age <= 120) safe.age = p.age;
    if (typeof p.lifeStage === "string" && p.lifeStage.length <= 32) safe.lifeStage = p.lifeStage;
    if (Array.isArray(p.conditions)) safe.conditions = p.conditions.filter((x): x is string => typeof x === "string").slice(0, 8).map((x) => x.slice(0, 40));
    if (Object.keys(safe).length) out.profile = safe;
  }
  const cycle = input.cycle;
  if (cycle && typeof cycle === "object" && !Array.isArray(cycle)) {
    const c = cycle as Record<string, unknown>;
    const safe: NonNullable<PersonalizationContext["cycle"]> = {};
    const bounded = (key: keyof typeof safe, min: number, max: number) => {
      const value = c[key];
      if (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max) safe[key] = value as never;
    };
    bounded("loggedPeriods", 0, 60); bounded("averageCycleLength", 1, 120); bounded("cycleDay", 1, 120);
    bounded("daysUntilNext", -365, 365); bounded("recentPain", 0, 3);
    if (typeof c.regular === "boolean") safe.regular = c.regular;
    if (typeof c.phase === "string" && c.phase.length <= 20) safe.phase = c.phase;
    if (typeof c.recentFlow === "string" && ["light", "normal", "heavy"].includes(c.recentFlow)) safe.recentFlow = c.recentFlow;
    if (typeof c.recentHeavyBleeding === "boolean") safe.recentHeavyBleeding = c.recentHeavyBleeding;
    if (Object.keys(safe).length) out.cycle = safe;
  }
  return out;
}

export function errorJson(detail: string, status: number) {
  return NextResponse.json({ detail }, { status });
}
