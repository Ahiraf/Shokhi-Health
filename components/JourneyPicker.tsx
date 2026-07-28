"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useLang } from "./LanguageProvider";
import Mascot3D from "./Mascot3D";
import { JOURNEYS, type JourneyKey } from "@/lib/journeys";

export default function JourneyPicker({
  page,
  selected,
}: {
  page: "learn" | "guides";
  selected?: JourneyKey | null;
}) {
  const { lang } = useLang();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const en = lang === "en";

  async function findMyPath(event: FormEvent) {
    event.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, lang }),
      });
      const result = await response.json();
      if (!response.ok || !result.journey) throw new Error("journey failed");
      window.location.href = `/${page}?journey=${encodeURIComponent(result.journey)}`;
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl bg-gradient-to-br from-panel/95 to-panel-deep/95 p-5 text-white shadow-card sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="hidden shrink-0 sm:block">
            <Mascot3D variant="learn" size={92} fit="contain" position="top" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
              {en ? "Start with your situation" : "আপনার পরিস্থিতি দিয়ে শুরু করুন"}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">
              {en ? "What brings you here today?" : "আজ কী জানতে চান?"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/75">
              {en ? "You do not need to know a medical word. Pick the closest situation." : "কোনো কঠিন রোগের নাম জানা দরকার নেই — আপনার কাছাকাছি বিষয়টি বেছে নিন।"}
            </p>
          </div>
        </div>
        <form onSubmit={findMyPath} className="flex w-full flex-col gap-2 sm:max-w-[18rem]">
          <label className="text-xs font-semibold text-white/70" htmlFor={`${page}-journey-question`}>
            {en ? "Not sure? Tell Shokhi" : "বুঝতে পারছেন না? সখীকে বলুন"}
          </label>
          <div className="flex gap-2">
            <input
              id={`${page}-journey-question`}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={en ? "e.g. I have bad cramps" : "যেমন: মাসিকের সময় খুব ব্যথা"}
              className="min-w-0 flex-1 rounded-xl bg-white/12 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/20 placeholder:text-white/45 focus:ring-2 focus:ring-white/60"
            />
            <button
              type="submit"
              disabled={busy || !message.trim()}
              className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-bold text-panel-deep transition hover:bg-white/90 disabled:opacity-50"
            >
              {busy ? "…" : en ? "Find" : "খুঁজি"}
            </button>
          </div>
          {error && <p className="text-xs text-rose-100">{en ? "Please choose a card below." : "নিচের একটি বিষয় বেছে নিন।"}</p>}
        </form>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {JOURNEYS.map((journey) => {
          const active = selected === journey.key;
          return (
            <Link
              key={journey.key}
              href={`/${page}?journey=${journey.key}`}
              className={`group flex min-h-[5.7rem] items-center gap-2 rounded-2xl px-3 py-2.5 transition hover:-translate-y-0.5 ${
                active ? "bg-white text-panel-deep shadow-lift" : "bg-white/10 text-white hover:bg-white/18"
              }`}
            >
              <Mascot3D
                variant={journey.imageVariant}
                size={44}
                fit="cover"
                position="top"
                className={`shrink-0 rounded-xl object-cover ${active ? "bg-rose-mist" : "bg-white/12"}`}
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-snug">{en ? journey.title_en : journey.title_bn}</span>
                <span className={`mt-0.5 block text-xs leading-snug ${active ? "text-panel-deep/65" : "text-white/65"}`}>
                  {en ? journey.desc_en : journey.desc_bn}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
