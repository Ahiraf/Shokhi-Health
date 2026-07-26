"use client";

import { useMemo, useState } from "react";
import type { ReportRecord } from "@/lib/report-history";
import Icon from "./Icon";

function dateLabel(value: string, en: boolean) {
  return new Date(value).toLocaleDateString(en ? "en-US" : "bn-BD", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReportHistory({ history, en, onClear }: { history: ReportRecord[]; en: boolean; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const comparison = useMemo(() => {
    if (history.length < 2) return [];
    const latest = history[0];
    const previous = history.slice(1).find((entry) => entry.values.length > 0);
    if (!previous) return [];
    return latest.values.map((current) => {
      const old = previous.values.find((v) => v.key === current.key);
      return old ? { ...current, previous: old.value, delta: Number((current.value - old.value).toFixed(2)) } : null;
    }).filter(Boolean) as { label: string; value: number; previous: number; delta: number; unit?: string }[];
  }, [history]);

  if (!history.length) return null;
  return (
    <section className="mt-6 rounded-2xl bg-surface/75 p-4 ring-1 ring-rose-soft">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 text-left">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-mist text-rose-deep"><Icon name="activity" size={16} /></span>
        <span className="font-display font-bold text-plum">{en ? "Report history & comparison" : "রিপোর্টের ইতিহাস ও তুলনা"}</span>
        <span className="ml-auto text-xs text-plum/50">{history.length} {en ? "saved locally" : "টি ফোনে আছে"}</span>
        <Icon name="chevron" size={16} className={`text-rose-deep transition ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          {comparison.length > 0 && (
            <div className="rounded-xl bg-sage-soft/60 p-3 text-sm text-plum/80">
              <p className="font-semibold text-sage-deep">{en ? "Latest vs previous report" : "সর্বশেষ ও আগের রিপোর্টের তুলনা"}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {comparison.map((item) => (
                  <div key={item.label} className="rounded-lg bg-surface/70 px-3 py-2">
                    <b>{item.label}</b>: {item.previous} → {item.value} {item.unit || ""}
                    <span className={`ml-1 text-xs ${item.delta > 0 ? "text-emerald-600" : item.delta < 0 ? "text-rose-deep" : "text-plum/50"}`}>
                      ({item.delta > 0 ? "+" : ""}{item.delta})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {history.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 rounded-xl bg-cream/70 px-3 py-2.5 text-sm">
              <span className="mt-0.5 text-rose-deep">{entry.source === "image" ? "▧" : "⌕"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-plum">{entry.label || (en ? "Report" : "রিপোর্ট")}</p>
                <p className="text-xs text-plum/50">{dateLabel(entry.createdAt, en)} · {entry.values.length} {en ? "values found" : "টি মান পাওয়া গেছে"}</p>
              </div>
              {entry.criticalLevel && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{entry.criticalLevel === "urgent" ? (en ? "Urgent" : "জরুরি") : (en ? "Review" : "দেখুন")}</span>}
            </div>
          ))}
          <button onClick={onClear} className="pt-1 text-xs font-semibold text-plum/45 hover:text-rose-deep">{en ? "Clear local history" : "ফোনের ইতিহাস মুছুন"}</button>
        </div>
      )}
    </section>
  );
}
