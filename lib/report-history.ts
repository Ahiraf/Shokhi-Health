import type { CycleLog } from "./types";

export const REPORT_HISTORY_KEY = "shokhi_report_history";

export type ReportSource = "typed" | "image";

export interface LabValue {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

export interface ReportRecord {
  id: string;
  createdAt: string;
  source: ReportSource;
  label: string;
  input: string;
  analysis: string;
  values: LabValue[];
  criticalLevel: "urgent" | "low" | null;
}

const KNOWN_TESTS: { key: string; label: string; aliases: string[] }[] = [
  { key: "haemoglobin", label: "Haemoglobin", aliases: ["haemoglobin", "hemoglobin", "hgb", "hb", "হিমোগ্লোবিন", "এইচবি"] },
  { key: "tsh", label: "TSH", aliases: ["tsh", "টিএসএইচ"] },
  { key: "platelets", label: "Platelets", aliases: ["platelet", "platelets", "প্লেটলেট"] },
  { key: "wbc", label: "WBC", aliases: ["wbc", "white blood cell", "শ্বেত রক্তকণিকা"] },
  { key: "glucose", label: "Glucose", aliases: ["glucose", "blood sugar", "শর্করা", "গ্লুকোজ"] },
  { key: "ferritin", label: "Ferritin", aliases: ["ferritin", "ফেরিটিন"] },
  { key: "vitamin_d", label: "Vitamin D", aliases: ["vitamin d", "vit d", "ভিটামিন ডি"] },
  { key: "creatinine", label: "Creatinine", aliases: ["creatinine", "ক্রিয়েটিনিন"] },
];

function normaliseDigits(text: string): string {
  const bn = "০১২৩৪৫৬৭৮৯";
  return text.replace(/[০-৯]/g, (d) => String(bn.indexOf(d)));
}

function escaped(alias: string): string {
  return alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extracts only obvious label → number pairs for local trend comparison. */
export function extractLabValues(text: string): LabValue[] {
  const normalised = normaliseDigits(text || "");
  const values: LabValue[] = [];
  for (const test of KNOWN_TESTS) {
    const aliases = test.aliases.map(escaped).join("|");
    const match = normalised.match(new RegExp(`(?:${aliases})[^\\d\\n]{0,24}(\\d+(?:\\.\\d+)?)\\s*([a-zA-Z/%µμ]*)`, "i"));
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    values.push({ key: test.key, label: test.label, value, unit: match[2] || undefined });
  }
  return values;
}

export function loadReportHistory(): ReportRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(REPORT_HISTORY_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((r) => r && typeof r.id === "string" && typeof r.analysis === "string") : [];
  } catch {
    return [];
  }
}

export function saveReportRecord(record: ReportRecord): ReportRecord[] {
  if (typeof window === "undefined") return [];
  const next = [record, ...loadReportHistory()].slice(0, 12);
  localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearReportHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REPORT_HISTORY_KEY);
}

export function makeReportRecord(args: {
  source: ReportSource;
  label: string;
  input?: string;
  analysis: string;
  criticalLevel?: "urgent" | "low" | null;
}): ReportRecord {
  const input = args.input || "";
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    source: args.source,
    label: args.label,
    input,
    analysis: args.analysis,
    values: extractLabValues(`${input}\n${args.analysis}`),
    criticalLevel: args.criticalLevel ?? null,
  };
}

export function formatCycleContext(logs: CycleLog[]): { loggedPeriods: number; recentStarts: string[] } {
  return {
    loggedPeriods: logs.length,
    recentStarts: [...logs].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 5).map((l) => l.start),
  };
}
