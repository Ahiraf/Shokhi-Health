"use client";

import { useMemo, useState } from "react";
import Icon from "./Icon";
import type { ReportRecord } from "@/lib/report-history";

export default function DoctorSummary({ record, en }: { record: ReportRecord; en: boolean }) {
  const [open, setOpen] = useState(false);
  const summary = useMemo(() => {
    const values = record.values.length
      ? record.values.map((v) => `- ${v.label}: ${v.value}${v.unit ? ` ${v.unit}` : ""}`).join("\n")
      : en ? "- No numeric values were extracted automatically." : "- কোনো সংখ্যামান স্বয়ংক্রিয়ভাবে বের করা যায়নি।";
    return [
      en ? "Shokhi report visit summary" : "সখীর রিপোর্ট-ভিজিট সারাংশ",
      `${en ? "Date" : "তারিখ"}: ${new Date(record.createdAt).toLocaleDateString(en ? "en-US" : "bn-BD")}`,
      `${en ? "Source" : "উৎস"}: ${record.source === "image" ? (en ? "Photo upload" : "ছবির রিপোর্ট") : (en ? "Typed values" : "লিখিত মান")}`,
      `${en ? "Report values" : "রিপোর্টের মান"}:\n${values}`,
      record.input ? `${en ? "What I entered" : "আমি যা লিখেছি"}: ${record.input}` : "",
      "",
      en ? "Please confirm the interpretation with a qualified doctor or health worker. This is not a diagnosis." : "এই ব্যাখ্যা একজন যোগ্য ডাক্তার বা স্বাস্থ্যকর্মীর সঙ্গে নিশ্চিত করুন। এটি রোগ নির্ণয় নয়।",
    ].filter(Boolean).join("\n");
  }, [en, record]);

  async function copy() {
    try { await navigator.clipboard.writeText(summary); } catch { /* download remains available */ }
  }

  function download() {
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "shokhi-doctor-summary.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-4 rounded-2xl bg-sage-soft/60 p-4 ring-1 ring-sage-deep/20">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center gap-2 text-left text-sm font-semibold text-sage-deep">
        <Icon name="note" size={17} />
        {en ? "Doctor handoff summary" : "ডাক্তারের জন্য সারাংশ"}
        <Icon name="chevron" size={15} className={`ml-auto transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-surface/70 p-3 text-xs leading-relaxed text-plum/75">{summary}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copy} className="rounded-full bg-sage-deep px-4 py-2 text-xs font-semibold text-accentink">{en ? "Copy summary" : "সারাংশ কপি করুন"}</button>
            <button onClick={download} className="rounded-full bg-surface px-4 py-2 text-xs font-semibold text-sage-deep ring-1 ring-sage-deep/25">{en ? "Download" : "ডাউনলোড"}</button>
          </div>
        </>
      )}
    </div>
  );
}
