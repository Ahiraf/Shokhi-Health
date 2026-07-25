"use client";

import { useState } from "react";
import { useLang } from "@/components/LanguageProvider";
import { composeStream } from "@/lib/api";
import { detectCriticalLab } from "@/lib/server/personal";
import PageHeader from "@/components/PageHeader";
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

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <PageHeader
        icon="🩺"
        title={en ? "Understand a test report" : "রিপোর্ট বুঝুন"}
        sub={en ? "Type a value from your lab report and Shokhi explains it in simple words. General information — always confirm with a doctor." : "রিপোর্টের কোনো মান লিখুন, সখী সহজ ভাষায় বুঝিয়ে দেবে। এটি সাধারণ তথ্য — সবসময় ডাক্তারের সাথে নিশ্চিত করুন।"}
      />

      <div className="mt-8 space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder={en ? "e.g. Hemoglobin 9.5, TSH 4.2 …" : "যেমন: হিমোগ্লোবিন ৯.৫, টিএসএইচ ৪.২ …"}
          className="w-full rounded-2xl border border-rose-soft bg-surface px-4 py-3 text-plum outline-none focus:ring-2 focus:ring-rose/40"
        />
        <button
          onClick={run}
          disabled={!input.trim() || loading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-rose to-rose-deep px-5 py-2.5 font-semibold text-accentink shadow-soft transition hover:brightness-105 disabled:opacity-50"
        >
          <Icon name="sparkle" size={16} />
          {loading ? (en ? "Shokhi is reading…" : "সখী পড়ছে…") : en ? "Explain this" : "বুঝিয়ে দিন"}
        </button>
      </div>

      {/* deterministic critical banner — never softened by the LLM */}
      {critical?.level && (
        <div className={`mt-5 flex items-start gap-2 rounded-2xl p-4 text-sm ${critical.level === "urgent" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          <p className="font-medium">{en ? critical.note_en : critical.note_bn}</p>
        </div>
      )}

      {text && (
        <div className="mt-5 rounded-2xl bg-rose-mist/70 p-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-plum/85">{text}</div>
          {!loading && (
            <div className="mt-2 flex justify-end">
              <SpeakButton text={text} size="sm" />
            </div>
          )}
        </div>
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
