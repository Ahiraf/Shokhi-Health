"use client";

import Icon from "./Icon";

type Section = { title: string; body: string };

function splitSections(text: string, fallbackTitle: string): Section[] {
  const matches = [...text.matchAll(/^\s*#{1,3}\s+(.+)\s*$/gm)];
  if (!matches.length) return [{ title: fallbackTitle, body: text.trim() }];
  return matches.map((match, index) => ({
    title: match[1].replace(/[*_]/g, "").trim(),
    body: text.slice(match.index! + match[0].length, matches[index + 1]?.index ?? text.length).trim(),
  })).filter((section) => section.body);
}

export default function ReportAdvice({
  text,
  loading,
  en,
  onDoctorSummary,
}: {
  text: string;
  loading: boolean;
  en: boolean;
  onDoctorSummary: () => void;
}) {
  const sections = splitSections(text, en ? "Shokhi’s explanation" : "সখীর সহজ ব্যাখ্যা");

  return (
    <section className="mt-8 rounded-3xl bg-surface/95 p-5 ring-1 ring-rose-soft/80 shadow-card sm:p-8" aria-live="polite">
      <div className="flex items-center gap-3 border-b border-rose-soft/70 pb-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose/15 text-rose-deep">
          <Icon name="sparkle" size={21} />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-plum sm:text-xl">
            {en ? "Shokhi’s report advice" : "রিপোর্ট নিয়ে সখীর পরামর্শ"}
          </h2>
          <p className="text-xs text-plum/55">
            {loading ? (en ? "Shokhi is still reading…" : "সখী এখনও পড়ছে…") : en ? "A simple explanation for you" : "আপনার জন্য সহজ করে বলা"}
          </p>
        </div>
        {loading && <span className="ml-auto animate-pulse text-rose-deep">●●●</span>}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {sections.map((section, index) => (
          <article key={`${section.title}-${index}`} className={`rounded-2xl bg-rose-mist/65 p-5 ${index === 0 ? "sm:col-span-2" : ""}`}>
            <h3 className="font-display text-base font-bold text-rose-deep">{section.title}</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-[17px] leading-[1.9] text-plum/90 sm:text-lg">{section.body}</p>
          </article>
        ))}
      </div>

      {!loading && (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-rose-soft/60 pt-4">
          <button onClick={onDoctorSummary} className="inline-flex items-center gap-2 rounded-full bg-rose-mist px-4 py-2 text-xs font-semibold text-rose-deep ring-1 ring-rose-soft transition hover:bg-rose-soft">
            <Icon name="note" size={15} />
            {en ? "Prepare doctor summary" : "ডাক্তারের জন্য সারাংশ"}
          </button>
        </div>
      )}
    </section>
  );
}
