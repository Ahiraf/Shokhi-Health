"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { explainGuide } from "@/lib/api";
import { getSourceTopic } from "@/lib/source-topics";
import { useLang } from "@/components/LanguageProvider";
import { EmojiIcon } from "@/components/Icon";
import SpeakButton from "@/components/SpeakButton";

export default function SourceTopicPage() {
  const { t, lang } = useLang();
  const { topic: topicId } = useParams<{ topic: string }>();
  const topic = getSourceTopic(topicId);
  const [guidance, setGuidance] = useState("");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!topic) { setStatus("error"); return; }
    setStatus("loading");
    explainGuide(topic.query, lang)
      .then((result) => { setGuidance(result.guidance); setStatus("ok"); })
      .catch(() => setStatus("error"));
  }, [topic, lang]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/guides" className="text-sm font-semibold text-rose hover:underline">{t("guides.backAll")}</Link>
      {!topic || status === "error" ? (
        <p className="mt-8 text-plum/60">{t("guides.notFound")}</p>
      ) : (
        <article className="mt-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blush text-rose-deep"><EmojiIcon glyph={topic.icon} size={28} /></span>
            <div>
              <p className="text-xs font-semibold text-rose-deep">{topic.source}</p>
              <h1 className="font-display text-2xl font-bold text-plum">{lang === "en" ? topic.title_en : topic.title_bn}</h1>
            </div>
            {guidance && <SpeakButton className="ml-auto self-start" text={guidance} />}
          </div>
          {status === "loading" && <p className="mt-8 text-plum/50">{t("common.loading")}</p>}
          {status === "ok" && <p className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-plum/75">{guidance}</p>}
          <p className="mt-8 text-xs leading-relaxed text-plum/45">{t("common.generalInfoNote")}</p>
        </article>
      )}
    </main>
  );
}
