"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { explainGuide } from "@/lib/api";
import { getSourceTopic, SOURCE_GUIDE_IDS, SOURCE_CONDITION_IDS } from "@/lib/source-topics";
import { useLang } from "@/components/LanguageProvider";
import { EmojiIcon } from "@/components/Icon";
import Image from "next/image";
import { mascotImageFor } from "@/lib/mascot-images";

export default function SourceTopicPage() {
  const { t, lang } = useLang();
  const { topic: topicId } = useParams<{ topic: string }>();
  const topic = getSourceTopic(topicId);
  const [guidance, setGuidance] = useState("");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const canonicalGuideId = SOURCE_GUIDE_IDS[topicId];
  const canonicalConditionId = SOURCE_CONDITION_IDS[topicId];

  useEffect(() => {
    if (canonicalGuideId) {
      window.location.replace(`/guides/${canonicalGuideId}`);
      return;
    }
    if (canonicalConditionId) {
      window.location.replace(`/learn/${canonicalConditionId}`);
      return;
    }
    if (!topic) { setStatus("error"); return; }
    setStatus("loading");
    explainGuide(topic.query, lang)
      .then((result) => { setGuidance(result.guidance); setStatus("ok"); })
      .catch(() => setStatus("error"));
  }, [topic, lang, canonicalGuideId, canonicalConditionId]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/learn" className="text-sm font-semibold text-rose hover:underline">{t("guides.backAll")}</Link>
      {!topic || status === "error" ? (
        <p className="mt-8 text-plum/60">{t("guides.notFound")}</p>
      ) : (
        <article className="mt-4">
          <div className="relative mb-5 flex min-h-64 items-center justify-center overflow-hidden rounded-3xl bg-blush p-3 sm:min-h-80">
            <Image src={mascotImageFor(topic.id)} alt="" fill sizes="(max-width: 640px) 100vw, 672px" className="object-contain" priority />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blush text-rose-deep"><EmojiIcon glyph={topic.icon} size={28} /></span>
            <div>
              <p className="text-xs font-semibold text-rose-deep">{topic.source}</p>
              <h1 className="font-display text-2xl font-bold text-plum">{lang === "en" ? topic.title_en : topic.title_bn}</h1>
            </div>
          </div>
          {status === "loading" && <p className="mt-8 text-plum/50">{t("common.loading")}</p>}
          {status === "ok" && <p className="mt-6 whitespace-pre-wrap text-[17px] leading-[1.9] text-plum/85 sm:text-lg">{guidance}</p>}
          <p className="mt-8 text-xs leading-relaxed text-plum/45">{t("common.generalInfoNote")}</p>
        </article>
      )}
    </main>
  );
}
