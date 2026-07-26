"use client";

import { useState } from "react";
import { composeStream } from "@/lib/api";
import { useLang } from "./LanguageProvider";
import Icon from "./Icon";
import SpeakButton from "./SpeakButton";

/**
 * A reusable on-demand Gemma panel: a button that, when tapped, streams a personalised note
 * (today plan, cycle explanation, mood reflection, family note, report explainer) written by
 * Gemma, with a listen button. Kept on-demand so the ~30s model latency never blocks a page.
 */
export default function GemmaPanel({
  kind,
  data,
  cta,
  title,
}: {
  kind: "today" | "cycle" | "report" | "mood" | "family" | "weekly";
  data: () => Record<string, unknown>;
  cta: string;
  title?: string;
}) {
  const { lang } = useLang();
  const en = lang === "en";
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function run() {
    setLoading(true);
    setError(false);
    setText("");
    try {
      await composeStream(kind, data(), lang, (c) => setText((p) => p + c));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-bold text-rose-deep">{title}</p>}

      {!text && (
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-rose to-rose-deep px-4 py-2 text-sm font-semibold text-accentink shadow-soft transition hover:brightness-105 disabled:opacity-60"
        >
          <Icon name="sparkle" size={15} />
          {loading ? (en ? "Shokhi is writing…" : "সখী লিখছে…") : cta}
        </button>
      )}

      {text && (
        <div className="rounded-2xl bg-rose-mist/70 p-5 ring-1 ring-rose-soft/70 shadow-soft sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-rose-deep">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose/20">
              <Icon name="sparkle" size={14} />
            </span>
            {en ? "Shokhi’s note" : "সখীর কথা"}
            {loading && <span className="ml-1 animate-pulse">…</span>}
          </div>
          <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.85] text-plum/90 sm:text-base">{text}</div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-rose-soft/60 pt-3">
            {!loading && (
              <button onClick={run} className="text-xs font-semibold text-rose-deep/70 hover:text-rose-deep">
                {en ? "Again" : "আবার"}
              </button>
            )}
            <SpeakButton text={text} size="sm" />
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">
          {en ? "Couldn't write that just now. Please try again." : "এখন লেখা গেল না। আবার চেষ্টা করুন।"}
        </p>
      )}
    </div>
  );
}
