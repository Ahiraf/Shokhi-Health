"use client";

import { useMemo } from "react";
import { useLang } from "./LanguageProvider";
import { fromDays, toDays, todayDays } from "@/lib/cycle-insights";

const BN = "০১২৩৪৫৬৭৮৯";
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => BN[+d]);
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_BN = ["জানু","ফেব","মার্চ","এপ্রি","মে","জুন","জুল","আগ","সেপ","অক্টো","নভে","ডিসে"];

/**
 * All-time period visualisation (never capped at N months):
 *   1) a GitHub-contribution-style heatmap of EVERY logged period day, and
 *   2) a labeled line graph of EVERY completed cycle's length with the normal 21–35 day band.
 * Both scroll horizontally so the full history is always visible.
 */
export default function CycleTrends({
  periodDays,
  cycles,
}: {
  periodDays: Set<string>;
  cycles: { start: string; length: number }[];
}) {
  const { t, lang } = useLang();
  const num = (n: number | string) => (lang === "en" ? String(n) : toBn(n));
  const months = lang === "en" ? MONTHS_EN : MONTHS_BN;

  // ---- heatmap weeks (all-time) ----
  const weeks = useMemo(() => {
    if (!periodDays.size) return [];
    const days = [...periodDays].map(toDays).sort((a, b) => a - b);
    const today = todayDays();
    // start on the Sunday on/before the first logged day
    const firstDate = new Date(days[0] * 86_400_000);
    let startDay = days[0] - firstDate.getDay();
    const cols: { iso: string; on: boolean; dow: number }[][] = [];
    let col: { iso: string; on: boolean; dow: number }[] = [];
    for (let d = startDay; d <= today; d++) {
      const iso = fromDays(d);
      const dow = new Date(d * 86_400_000).getDay();
      col.push({ iso, on: periodDays.has(iso), dow });
      if (dow === 6) { cols.push(col); col = []; }
    }
    if (col.length) cols.push(col);
    return cols;
  }, [periodDays]);

  // month labels aligned to the first column of each month
  const monthMarks = useMemo(() => {
    const marks: { idx: number; label: string }[] = [];
    let lastKey = "";
    weeks.forEach((wk, i) => {
      const firstReal = wk.find(Boolean);
      if (!firstReal) return;
      const d = new Date(firstReal.iso);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== lastKey) {
        lastKey = key;
        marks.push({ idx: i, label: `${months[d.getMonth()]}${d.getMonth() === 0 ? " " + num(d.getFullYear()) : ""}` });
      }
    });
    return marks;
  }, [weeks, months, lang]);

  const chartWidth = Math.max(520, cycles.length * 86 + 72);
  const chartHeight = 260;
  const plot = { left: 38, right: 42, top: 18, bottom: 58 };
  const yMin = 15;
  const yMax = Math.max(55, Math.ceil(Math.max(...cycles.map((c) => c.length), 55) / 10) * 10);
  const plotWidth = chartWidth - plot.left - plot.right;
  const plotHeight = chartHeight - plot.top - plot.bottom;
  const xFor = (index: number) => cycles.length === 1
    ? plot.left + plotWidth / 2
    : plot.left + (index / (cycles.length - 1)) * plotWidth;
  const yFor = (value: number) => plot.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  const points = cycles.map((cycle, index) => `${xFor(index)},${yFor(cycle.length)}`).join(" ");
  const ticks = Array.from({ length: Math.floor((yMax - yMin) / 10) + 1 }, (_, index) => yMin + index * 10);

  return (
    <div className="space-y-5">
      {/* 1) period heatmap */}
      <div>
        <p className="mb-2 text-sm font-semibold text-rose-deep">{t("tracker.heatmapTitle")}</p>
        {weeks.length === 0 ? (
          <p className="text-xs text-rose-deep/50">{t("tracker.trendEmpty")}</p>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="inline-block">
              <div className="mb-1 flex text-[9px] text-rose-deep/50" style={{ gap: 2 }}>
                {weeks.map((_, i) => {
                  const mark = monthMarks.find((m) => m.idx === i);
                  return <div key={i} style={{ width: 12 }}>{mark ? <span className="whitespace-nowrap">{mark.label}</span> : ""}</div>;
                })}
              </div>
              <div className="flex" style={{ gap: 2 }}>
                {weeks.map((wk, i) => (
                  <div key={i} className="flex flex-col" style={{ gap: 2 }}>
                    {Array.from({ length: 7 }, (_, dow) => {
                      const cell = wk.find((c) => c.dow === dow);
                      const on = cell?.on;
                      return (
                        <div
                          key={dow}
                          title={cell?.iso}
                          style={{ width: 12, height: 12 }}
                          className={`rounded-[3px] ${on ? "bg-rose-deep" : "bg-rose-soft/50"}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2) all-time cycle-length line chart */}
      <div>
        <p className="mb-2 text-sm font-semibold text-rose-deep">{t("tracker.trendTitle")}</p>
        {cycles.length === 0 ? (
          <p className="text-xs text-rose-deep/50">{t("tracker.trendNeedTwo")}</p>
        ) : (
          <div className="overflow-x-auto pb-1">
            <svg
              role="img"
              aria-label={t("tracker.trendTitle")}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              width={chartWidth}
              height={chartHeight}
              className="max-w-none overflow-visible"
            >
              <rect
                x={plot.left}
                y={yFor(35)}
                width={plotWidth}
                height={yFor(21) - yFor(35)}
                fill="rgb(var(--c-sage-soft))"
                opacity="0.72"
              />
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={plot.left}
                    x2={chartWidth - plot.right}
                    y1={yFor(tick)}
                    y2={yFor(tick)}
                    stroke="rgb(var(--c-rose-soft))"
                    strokeOpacity="0.7"
                  />
                  <text x={plot.left - 8} y={yFor(tick) + 4} textAnchor="end" fontSize="11" fill="rgb(var(--c-rose-deep))">
                    {num(tick)}
                  </text>
                </g>
              ))}
              <polyline
                points={points}
                fill="none"
                stroke="rgb(var(--c-rose-deep))"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {cycles.map((cycle, index) => {
                const x = xFor(index);
                const y = yFor(cycle.length);
                return (
                  <g key={cycle.start}>
                    <circle cx={x} cy={y} r="6" fill="rgb(var(--c-rose-deep))" stroke="rgb(var(--c-surface))" strokeWidth="3" />
                    <text x={x} y={y - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="rgb(var(--c-rose-deep))">
                      {num(cycle.length)}
                    </text>
                    <text x={x} y={chartHeight - 33} textAnchor="middle" fontSize="11" fill="rgb(var(--c-plum-soft))">
                      <tspan x={x} dy="0">{cycle.start.slice(5)}</tspan>
                      <tspan x={x} dy="14">{num(cycle.start.slice(0, 4))}</tspan>
                    </text>
                  </g>
                );
              })}
              <text x={chartWidth - 6} y={plot.top + plotHeight / 2} textAnchor="middle" fontSize="11" fill="rgb(var(--c-plum-soft))" transform={`rotate(90 ${chartWidth - 6} ${plot.top + plotHeight / 2})`}>
                {lang === "en" ? "Cycle length, days" : "চক্রের দৈর্ঘ্য, দিন"}
              </text>
              <text x={plot.left + plotWidth / 2} y={chartHeight - 3} textAnchor="middle" fontSize="11" fill="rgb(var(--c-plum-soft))">
                {lang === "en" ? "Cycle start date" : "চক্র শুরুর তারিখ"}
              </text>
            </svg>
          </div>
        )}
        <p className="mt-1.5 text-[10px] text-rose-deep/50">{t("tracker.trendBand")}</p>
      </div>
    </div>
  );
}
