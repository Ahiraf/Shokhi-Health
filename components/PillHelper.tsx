"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "./LanguageProvider";

type PillKind = "combined" | "mini" | "emergency" | "unknown";
type Problem = "late_one" | "missed_more" | "unprotected" | "vomited" | "unknown";

/**
 * A conservative, source-backed decision aid. It never gives a brand-specific dose:
 * pill rules vary by product, number missed, and personal health context.
 */
export default function PillHelper() {
  const { lang } = useLang();
  const en = lang === "en";
  const [kind, setKind] = useState<PillKind | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  const ready = Boolean(kind && problem);
  const emergency = kind === "emergency" || problem === "unprotected";
  const uncertain = kind === "unknown" || problem === "unknown";

  function reset() { setKind(null); setProblem(null); }

  return (
    <section className="mt-8 rounded-3xl border border-rose-soft bg-surface p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-deep">
        {en ? "Private decision aid" : "ব্যক্তিগত সিদ্ধান্ত-সহায়ক"}
      </p>
      <h2 className="mt-1 font-display text-xl font-bold text-plum">
        {en ? "Missed or late contraception pill?" : "পিল খেতে ভুলে গেছেন বা দেরি হয়েছে?"}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-plum/65">
        {en
          ? "Answer two questions. Shokhi will show the safest next conversation — not a prescription."
          : "দুটি প্রশ্নের উত্তর দিন। সখী প্রেসক্রিপশন নয়, নিরাপদ পরের পদক্ষেপ দেখাবে।"}
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-2 text-sm font-semibold text-plum">{en ? "Which kind?" : "কোন ধরনের পিল?"}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["combined", en ? "Daily combined pill" : "প্রতিদিনের কম্বাইন্ড পিল"],
              ["mini", en ? "Progestogen-only / mini-pill" : "প্রোজেস্টেরন-only / মিনি-পিল"],
              ["emergency", en ? "Emergency pill" : "জরুরি পিল"],
              ["unknown", en ? "I am not sure" : "আমি নিশ্চিত নই"],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setKind(value)} className={`rounded-xl px-3 py-2 text-left text-sm font-medium ring-1 transition ${kind === value ? "bg-rose text-accentink ring-rose" : "bg-rose-mist/60 text-plum ring-rose-soft hover:bg-blush"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-plum">{en ? "What happened?" : "কী হয়েছে?"}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["late_one", en ? "One pill was late" : "একটি পিল দেরি হয়েছে"],
              ["missed_more", en ? "More than one was missed" : "একাধিক পিল বাদ গেছে"],
              ["unprotected", en ? "Unprotected sex" : "অসুরক্ষিত সহবাস হয়েছে"],
              ["vomited", en ? "Vomited after taking it" : "খাওয়ার পর বমি হয়েছে"],
              ["unknown", en ? "Something else / not sure" : "অন্য কিছু / নিশ্চিত নই"],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setProblem(value)} className={`rounded-xl px-3 py-2 text-left text-sm font-medium ring-1 transition ${problem === value ? "bg-rose text-accentink ring-rose" : "bg-rose-mist/60 text-plum ring-rose-soft hover:bg-blush"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {ready && (
        <div className={`mt-4 rounded-2xl p-4 ${emergency ? "bg-amber-100 text-amber-950" : "bg-sage-soft text-sage-deep"}`}>
          <p className="font-semibold">
            {emergency
              ? en ? "Please seek time-sensitive advice today." : "আজই সময়-সংবেদনশীল পরামর্শ নিন।"
              : en ? "Use the pack instructions and get product-specific advice." : "প্যাকেটের নির্দেশনা দেখুন এবং পিলের ধরন অনুযায়ী পরামর্শ নিন।"}
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            {uncertain
              ? en
                ? "Take the packet or a photo of its name to a pharmacist or family-planning worker. Do not guess the rule from a different pill."
                : "পিলের প্যাকেট বা নামের ছবি নিয়ে ফার্মাসিস্ট বা পরিবার-পরিকল্পনা কর্মীর কাছে যান। অন্য পিলের নিয়ম ধরে অনুমান করবেন না।"
              : emergency
                ? en
                  ? "Emergency contraception works best as soon as possible; some options can be used within 5 days. A pharmacist or health worker can check which option fits you. It does not protect against STIs."
                  : "জরুরি গর্ভনিরোধ যত তাড়াতাড়ি নেওয়া যায় তত ভালো; কিছু পদ্ধতি ৫ দিনের মধ্যে ব্যবহার করা যায়। ফার্মাসিস্ট বা স্বাস্থ্যকর্মী আপনার জন্য কোনটি ঠিক তা বলবেন। এটি STI থেকে সুরক্ষা দেয় না।"
                : en
                  ? "For many daily pills, one late pill is taken as soon as remembered and the schedule continues. The exact advice changes with the pill type and how many were missed; use condoms or ask a health worker until you have checked."
                  : "অনেক দৈনিক পিলের ক্ষেত্রে একটি পিল দেরি হলে মনে পড়ার সাথে খেয়ে নিয়ম চালিয়ে যেতে বলা হয়। তবে পিলের ধরন ও কতটি বাদ গেছে তার ওপর নিয়ম বদলায়; নিশ্চিত না হওয়া পর্যন্ত কনডম ব্যবহার করুন বা স্বাস্থ্যকর্মীকে জিজ্ঞাসা করুন।"}
          </p>
          <p className="mt-2 text-xs opacity-75">
            {en ? "WHO 2025 practice recommendations · general information, not a prescription" : "WHO ২০২৫ ব্যবহার-নির্দেশনা · সাধারণ তথ্য, প্রেসক্রিপশন নয়"}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/chat" className="rounded-full bg-rose px-4 py-2 text-sm font-semibold text-accentink">
          {en ? "Ask Shokhi privately" : "সখীকে ব্যক্তিগতভাবে জিজ্ঞাসা করুন"}
        </Link>
        {ready && <button onClick={reset} className="rounded-full bg-rose-soft px-4 py-2 text-sm font-medium text-rose-deep">{en ? "Start again" : "আবার শুরু"}</button>}
      </div>
    </section>
  );
}
