"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getWellness } from "@/lib/api";
import type { WellnessMove } from "@/lib/types";
import { useLang } from "@/components/LanguageProvider";
import MoveVisual from "@/components/MoveVisual";

export default function MoveDetailPage() {
  const { lang } = useLang();
  const en = lang === "en";
  const { id } = useParams<{ id: string }>();
  const [move, setMove] = useState<WellnessMove | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    getWellness()
      .then((w) => {
        const m = w.moves.find((x) => x.id === id) || null;
        setMove(m);
        setStatus(m ? "ok" : "error");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  const pick = (base: "name" | "how" | "why") =>
    (en ? (move as any)?.[`${base}_en`] : "") || (move as any)?.[`${base}_bn`] || "";

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/wellness" className="text-sm font-semibold text-rose hover:underline">
        {en ? "← All exercises" : "← সব ব্যায়াম"}
      </Link>

      {status === "loading" && <p className="mt-8 text-plum/50">{en ? "Loading…" : "লোড হচ্ছে…"}</p>}
      {status === "error" && <p className="mt-8 text-plum/50">{en ? "Not found." : "পাওয়া যায়নি।"}</p>}

      {move && (
        <article className="mt-4">
          {/* cartoon girl demonstrating the move, on a soft glow halo (like the landing hero) */}
          <div className="py-4 text-center">
            <div className="hero-rings relative mx-auto flex h-72 w-72 items-center justify-center">
              <div className="relative z-10 flex items-center justify-center">
                <MoveVisual id={move.id} icon={move.icon} size={260} />
              </div>
            </div>
            <div className="mt-3 text-center">
              <h1 className="font-display text-2xl font-bold text-plum">{pick("name")}</h1>
            </div>
          </div>

          <section className="mt-6">
            <h2 className="font-display text-lg font-bold text-rose-deep">{en ? "How to do it" : "কীভাবে করবেন"}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-plum/80">{pick("how")}</p>
          </section>

          {pick("why") && (
            <section className="mt-6 rounded-2xl bg-blush/60 p-4">
              <h2 className="font-display text-lg font-bold text-rose-deep">{en ? "Why it helps" : "কেন উপকারী"}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-plum/80">{pick("why")}</p>
            </section>
          )}

          <div className="mt-8 rounded-2xl bg-surface/80 px-4 py-4 text-center ring-1 ring-rose-soft">
            <p className="text-sm text-plum/70">
              {en ? "Move gently, at your own pace. Stop if it hurts, and rest when you need to." : "নিজের গতিতে মৃদুভাবে করুন। ব্যথা হলে থামুন, দরকারে বিশ্রাম নিন।"}
            </p>
            <Link href="/wellness" className="mt-2 inline-block rounded-full bg-rose px-5 py-2 text-sm font-semibold text-accentink">
              {en ? "See more exercises" : "আরও ব্যায়াম দেখুন"}
            </Link>
          </div>
        </article>
      )}
    </main>
  );
}
