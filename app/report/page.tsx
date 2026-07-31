"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LanguageProvider";
import { composeStream, reportImageStream } from "@/lib/api";
import { detectCriticalLab } from "@/lib/server/personal";
import PageIntro from "@/components/PageIntro";
import Icon from "@/components/Icon";
import ReportAdvice from "@/components/ReportAdvice";
import DoctorSummary from "@/components/DoctorSummary";
import ReportHistory from "@/components/ReportHistory";
import {
  clearReportHistory,
  loadReportHistory,
  makeReportRecord,
  saveReportRecord,
  type ReportRecord,
} from "@/lib/report-history";

const REPORT_CAPABILITIES = [
  { icon: "sparkle" as const, bn: "গুছানো ব্যাখ্যা", en: "Structured advice", desc_bn: "সারাংশ, প্রতিটি মান, পরবর্তী পদক্ষেপ ও ডাক্তারকে প্রশ্ন—আলাদা কার্ডে।", desc_en: "Summary, value review, next steps, and doctor questions in separate cards." },
  { icon: "activity" as const, bn: "রিপোর্টের ইতিহাস", en: "Report history", desc_bn: "ফোনেই রিপোর্টের সারাংশ রাখুন এবং আগের মানের সঙ্গে তুলনা করুন।", desc_en: "Keep summaries on this phone and compare repeated values over time." },
  { icon: "note" as const, bn: "ডাক্তারের সারাংশ", en: "Doctor handoff", desc_bn: "ডাক্তারের কাছে দেখানোর জন্য সারাংশ কপি বা ডাউনলোড করুন।", desc_en: "Copy or download a compact summary for a doctor visit." },
  { icon: "health" as const, bn: "বিশেষজ্ঞ ছবি যাচাই", en: "Specialist image review", desc_bn: "ছবির মান, দেখা যাওয়া ফল ও অনিশ্চয়তা আরও সতর্কভাবে দেখা হয়।", desc_en: "Review image quality, visible values, ranges, and uncertainty more strictly." },
  { icon: "heart" as const, bn: "পরিবারকে বোঝানো", en: "Family modes", desc_bn: "পরিবার, সঙ্গী বা মা-বড়দের জন্য বার্তা আলাদা করে লিখুন।", desc_en: "Tailor the explanation for family, partner, or mother/elders." },
  { icon: "calendar" as const, bn: "সাপ্তাহিক সঙ্গী", en: "Weekly companion", desc_bn: "চক্র, মনের লগ ও নিজের তথ্য থেকে সপ্তাহের কোমল পরিকল্পনা।", desc_en: "A gentle weekly plan from cycle, mood, and personal context." },
];

export default function ReportPage() {
  const { lang } = useLang();
  const en = lang === "en";
  const [input, setInput] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [critical, setCritical] = useState<ReturnType<typeof detectCriticalLab> | null>(null);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [doctorRecord, setDoctorRecord] = useState<ReportRecord | null>(null);
  const [showDoctorSummary, setShowDoctorSummary] = useState(false);
  const [imageMode, setImageMode] = useState<"standard" | "specialist">("standard");
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => setHistory(loadReportHistory()), []);

  function keepRecord(record: ReportRecord) {
    setHistory(saveReportRecord(record));
    setDoctorRecord(record);
    setShowDoctorSummary(false);
  }

  async function run() {
    const entered = input.trim();
    if (!entered || loading) return;
    setLoading(true);
    setError(false);
    setText("");
    setPreview(null);
    setDoctorRecord(null);
    setShowDoctorSummary(false);
    const nextCritical = detectCriticalLab(entered);
    setCritical(nextCritical); // deterministic red flag, independent of the LLM
    try {
      const result = await composeStream("report", { text: entered }, lang, (c) => setText((p) => p + c));
      keepRecord(makeReportRecord({ source: "typed", label: en ? "Typed report" : "লিখিত রিপোর্ট", input: entered, analysis: result, criticalLevel: nextCritical.level }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function runImage(file: File) {
    setLoading(true);
    setError(false);
    setText("");
    setInput("");
    setDoctorRecord(null);
    setShowDoctorSummary(false);
    setCritical(null);
    setPreview(URL.createObjectURL(file));
    try {
      const result = await reportImageStream(file, lang, (c) => setText((p) => p + c), imageMode, (meta) => setCritical(meta.critical ?? null));
      keepRecord(makeReportRecord({ source: "image", label: file.name || (en ? "Photo report" : "ছবির রিপোর্ট"), analysis: result }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-10">
      <PageIntro
        icon="🩺"
        title={en ? "Understand a test report" : "রিপোর্ট বুঝুন"}
        sub={en ? "Type a value OR upload a photo of your report — Shokhi explains it in simple words. General information; always confirm with a doctor." : "রিপোর্টের মান লিখুন অথবা রিপোর্টের ছবি আপলোড করুন — সখী সহজ ভাষায় বুঝিয়ে দেবে। এটি সাধারণ তথ্য; সবসময় ডাক্তারের সাথে নিশ্চিত করুন।"}
        variant="report"
        side="left"
        size={140}
      />

      <section className="mt-7 rounded-3xl bg-surface/75 p-4 ring-1 ring-rose-soft sm:p-5" aria-labelledby="report-capabilities-title">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-mist text-rose-deep"><Icon name="sparkle" size={18} /></span>
          <div>
            <h2 id="report-capabilities-title" className="font-display text-lg font-bold text-plum">
              {en ? "What Shokhi can do with your report" : "এই রিপোর্ট নিয়ে সখী যা করতে পারে"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-plum/55">
              {en ? "Helpful tools around the explanation — always general information, never a diagnosis." : "ব্যাখ্যার পাশাপাশি কিছু সহায়ক সুবিধা — সবসময় সাধারণ তথ্য, রোগ নির্ণয় নয়।"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_CAPABILITIES.map((capability) => (
            <div key={capability.en} className="rounded-2xl bg-cream/70 p-3 ring-1 ring-rose-soft/60">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-mist text-rose-deep"><Icon name={capability.icon} size={16} /></span>
              <h3 className="mt-2 text-sm font-bold text-plum">{en ? capability.en : capability.bn}</h3>
              <p className="mt-1 text-xs leading-relaxed text-plum/60">{en ? capability.desc_en : capability.desc_bn}</p>
            </div>
          ))}
        </div>
      </section>

      {critical?.level && (
        <div className={`mt-5 flex items-start gap-2 rounded-2xl p-4 text-sm ${critical.level === "urgent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          <p className="font-medium">{en ? critical.note_en : critical.note_bn}</p>
        </div>
      )}

      {doctorRecord && showDoctorSummary && !loading && <DoctorSummary record={doctorRecord} en={en} />}
      {error && <p className="mt-4 text-sm text-red-500">{en ? "Couldn't read that just now. Please try again." : "এখন পড়া গেল না। আবার চেষ্টা করুন।"}</p>}

      <section className="mt-8 rounded-3xl bg-surface/90 p-3 ring-1 ring-rose-soft/80 shadow-card sm:p-4" aria-label={en ? "Report message composer" : "রিপোর্ট লেখার জায়গা"}>
        {preview && (
          <div className="mb-3 overflow-hidden rounded-2xl bg-rose-mist/65 p-3 ring-1 ring-rose-soft/60">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-plum/60">
              <Icon name="note" size={14} />
              {imageMode === "specialist" ? (en ? "Specialist review · attached report" : "বিশেষজ্ঞ যাচাই · যুক্ত করা রিপোর্ট") : en ? "Attached report" : "যুক্ত করা রিপোর্ট"}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={en ? "Attached report preview" : "যুক্ত করা রিপোর্টের ছবি"} className="max-h-[28rem] w-full rounded-xl object-contain ring-1 ring-rose-soft sm:max-h-[34rem]" />
          </div>
        )}

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          placeholder={en ? "Write the report values you want Shokhi to explain…" : "যে রিপোর্টের মান সখীকে বুঝাতে চান, এখানে লিখুন…"}
          className="min-h-[11rem] w-full resize-y rounded-2xl border border-rose-soft bg-surface px-5 py-4 text-base leading-relaxed text-plum outline-none placeholder:text-plum/45 focus:ring-2 focus:ring-rose/40 sm:min-h-[14rem]"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-surface px-5 py-2.5 font-semibold text-rose-deep ring-1 ring-rose-soft transition hover:bg-rose-mist disabled:opacity-50"
            >
              <Icon name="upload" size={16} />
              {en ? "Upload a photo" : "ছবি আপলোড করুন"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void runImage(f); e.target.value = ""; }}
              className="hidden"
            />
            <div className="flex items-center rounded-full bg-rose-mist/60 p-1 text-xs font-semibold ring-1 ring-rose-soft/70" aria-label={en ? "Image review mode" : "ছবি যাচাইয়ের ধরন"}>
              <button onClick={() => setImageMode("standard")} className={`rounded-full px-3 py-1.5 transition ${imageMode === "standard" ? "bg-surface text-rose-deep shadow-soft" : "text-plum/55"}`}>
                {en ? "Simple" : "সহজ"}
              </button>
              <button onClick={() => setImageMode("specialist")} className={`rounded-full px-3 py-1.5 transition ${imageMode === "specialist" ? "bg-rose text-accentink shadow-soft" : "text-plum/55"}`}>
                {en ? "Specialist review" : "বিশেষজ্ঞ যাচাই"}
              </button>
            </div>
          </div>

          <button
            onClick={() => void run()}
            disabled={!input.trim() || loading}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-rose to-rose-deep px-5 py-2.5 font-semibold text-accentink shadow-soft transition hover:brightness-105 disabled:opacity-50"
          >
            <Icon name="sparkle" size={16} />
            {loading ? (en ? "Shokhi is reading…" : "সখী পড়ছে…") : en ? "Explain this" : "বুঝিয়ে দিন"}
          </button>
        </div>
        <p className="mt-2 px-1 text-xs text-plum/45">
          {imageMode === "specialist"
            ? (en ? "Specialist review checks image quality and visible values more strictly; it is still not a diagnosis." : "বিশেষজ্ঞ যাচাই ছবির মান ও দেখা যাওয়া মান আরও সতর্কভাবে দেখে; এটিও রোগ নির্ণয় নয়।")
            : (en ? "Your report history stays on this phone only." : "আপনার রিপোর্টের ইতিহাস শুধু এই ফোনেই থাকে।")}
        </p>
      </section>

      {text && (
        <ReportAdvice
          text={text}
          loading={loading}
          en={en}
          onDoctorSummary={() => setShowDoctorSummary(true)}
        />
      )}

      <ReportHistory history={history} en={en} onClear={() => { clearReportHistory(); setHistory([]); setDoctorRecord(null); setShowDoctorSummary(false); }} />

      <p className="mt-6 text-xs leading-relaxed text-plum/45">
        {en
          ? "Shokhi gives general information, not a diagnosis. Please show your report to a doctor or health worker to be sure."
          : "সখী সাধারণ তথ্য দেয়, নিশ্চিত রোগ নির্ণয় নয়। নিশ্চিত হতে রিপোর্টটি একজন ডাক্তার বা স্বাস্থ্যকর্মীকে দেখান।"}
      </p>
    </main>
  );
}
