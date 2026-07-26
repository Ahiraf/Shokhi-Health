"use client";

import { useRef, useState } from "react";
import { useLang } from "@/components/LanguageProvider";
import { composeStream, reportImageStream } from "@/lib/api";
import { detectCriticalLab } from "@/lib/server/personal";
import PageIntro from "@/components/PageIntro";
import SpeakButton from "@/components/SpeakButton";
import Icon from "@/components/Icon";

export default function ReportPage() {
  const { lang } = useLang();
  const en = lang === "en";
  const [input, setInput] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [critical, setCritical] = useState<ReturnType<typeof detectCriticalLab> | null>(null);
  const [error, setError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function run() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(false);
    setText("");
    setCritical(detectCriticalLab(input)); // deterministic red flag, independent of the LLM
    try {
      await composeStream("report", { text: input }, lang, (c) => setText((p) => p + c));
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
    setCritical(null); // can't reliably parse a photo deterministically; the model flags in-text
    setPreview(URL.createObjectURL(file));
    try {
      await reportImageStream(file, lang, (c) => setText((p) => p + c));
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

      <div className="mt-8 space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder={en ? "e.g. Hemoglobin 9.5, TSH 4.2 …" : "যেমন: হিমোগ্লোবিন ৯.৫, টিএসএইচ ৪.২ …"}
          className="w-full rounded-2xl border border-rose-soft bg-surface px-4 py-3 text-plum outline-none focus:ring-2 focus:ring-rose/40"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={run}
            disabled={!input.trim() || loading}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-rose to-rose-deep px-5 py-2.5 font-semibold text-accentink shadow-soft transition hover:brightness-105 disabled:opacity-50"
          >
            <Icon name="sparkle" size={16} />
            {loading ? (en ? "Shokhi is reading…" : "সখী পড়ছে…") : en ? "Explain this" : "বুঝিয়ে দিন"}
          </button>

          {/* upload a photo of the report — for women who can't read the terms */}
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
            onChange={(e) => { const f = e.target.files?.[0]; if (f) runImage(f); e.target.value = ""; }}
            className="hidden"
          />
        </div>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="report" className="mt-1 max-h-72 rounded-2xl ring-1 ring-rose-soft" />
        )}
      </div>

      {/* deterministic critical banner — never softened by the LLM */}
      {critical?.level && (
        <div className={`mt-5 flex items-start gap-2 rounded-2xl p-4 text-sm ${critical.level === "urgent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          <p className="font-medium">{en ? critical.note_en : critical.note_bn}</p>
        </div>
      )}

      {text && (
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

          <div className="mt-6 min-h-[18rem] rounded-2xl bg-rose-mist/65 p-5 sm:min-h-[22rem] sm:p-7">
            <div className="whitespace-pre-wrap break-words text-base leading-[1.9] text-plum/90 sm:text-lg sm:leading-[1.85]">{text}</div>
          </div>

          {!loading && (
            <div className="mt-4 flex justify-end">
              <SpeakButton text={text} size="sm" />
            </div>
          )}
        </section>
      )}

      {error && <p className="mt-4 text-sm text-red-500">{en ? "Couldn't read that just now. Please try again." : "এখন পড়া গেল না। আবার চেষ্টা করুন।"}</p>}

      <p className="mt-6 text-xs leading-relaxed text-plum/45">
        {en
          ? "Shokhi gives general information, not a diagnosis. Please show your report to a doctor or health worker to be sure."
          : "সখী সাধারণ তথ্য দেয়, নিশ্চিত রোগ নির্ণয় নয়। নিশ্চিত হতে রিপোর্টটি একজন ডাক্তার বা স্বাস্থ্যকর্মীকে দেখান।"}
      </p>
    </main>
  );
}
