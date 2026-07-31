"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getGuide, getKnowledge } from "@/lib/api";
import type { Condition, GuideFull } from "@/lib/types";
import { useLang } from "@/components/LanguageProvider";
import { EmojiIcon } from "@/components/Icon";
import MethodFinder from "@/components/MethodFinder";
import { pickField } from "@/lib/i18n";
import GuideJourneyPath from "@/components/GuideJourneyPath";
import ConditionSelfCheck from "@/components/ConditionSelfCheck";
import PillHelper from "@/components/PillHelper";
import { guideJourney } from "@/lib/journeys";
import Image from "next/image";

const GUIDE_SELF_CHECK_CONDITIONS: Record<string, string> = {
  period_cramps: "primary_dysmenorrhea",
};

export default function GuideDetailPage() {
  const { t, lang } = useLang();
  const { id } = useParams<{ id: string }>();
  const [guide, setGuide] = useState<GuideFull | null>(null);
  const [selfCheckCondition, setSelfCheckCondition] = useState<Condition | null>(null);
  const [schema, setSchema] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const journey = guide ? guideJourney(guide.id) : undefined;

  useEffect(() => {
    Promise.all([getGuide(id), getKnowledge()])
      .then(([g, knowledge]) => {
        setGuide(g);
        const conditionId = GUIDE_SELF_CHECK_CONDITIONS[g.id];
        setSelfCheckCondition(knowledge.conditions.find((condition) => condition.id === conditionId) ?? null);
        setSchema((knowledge.symptom_schema as Record<string, any>) ?? {});
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/learn" className="text-sm font-semibold text-rose hover:underline">
        {t("guides.backAll")}
      </Link>

      {status === "loading" && <p className="mt-8 text-plum/50">{t("common.loading")}</p>}
      {status === "error" && <p className="mt-8 text-plum/50">{t("guides.notFound")}</p>}

      {guide && (
        <article className="mt-4">
          {guide.image && (
            <div className="relative mb-5 flex min-h-72 items-center justify-center overflow-hidden rounded-3xl bg-blush p-3 sm:min-h-[26rem]">
              <Image src={guide.image} alt="" fill sizes="(max-width: 640px) 100vw, 672px" className="object-contain" priority />
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blush text-rose-deep">
              <EmojiIcon glyph={guide.icon} size={28} />
            </span>
            <h1 className="font-display text-2xl font-bold leading-tight text-plum">
              {pickField<string>(lang, guide as unknown as Record<string, unknown>, "title")}
            </h1>
          </div>

            <p className="mt-4 text-[17px] leading-[1.9] text-plum/80 sm:text-lg">
            {pickField<string>(lang, guide as unknown as Record<string, unknown>, "summary")}
          </p>

          {guide.source && (
            <p className="mt-3 text-xs leading-relaxed text-plum/45">
              {lang === "en" ? "Source: " : "সূত্র: "}
              {guide.source_url ? (
                <a href={guide.source_url} target="_blank" rel="noreferrer" className="font-semibold text-rose hover:underline">
                  {guide.source}
                </a>
              ) : guide.source}
              {guide.reviewed ? " · " + (lang === "en" ? "reviewed " : "পর্যালোচনা ") + guide.reviewed : ""}
            </p>
          )}

          {journey && <GuideJourneyPath journey={journey} guideId={guide.id} />}

          <ul className="mt-6 space-y-3">
            {(pickField<string[]>(lang, guide as unknown as Record<string, unknown>, "points") ?? []).map((p, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl bg-surface/80 px-4 py-3 ring-1 ring-rose-soft"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-soft text-xs font-bold text-rose-deep">
                  {i + 1}
                </span>
                <span className="text-[17px] leading-[1.85] text-plum/85">{p}</span>
              </li>
            ))}
          </ul>

          {guide.when_see_doctor_bn && (
            <div className="mt-6 rounded-2xl bg-sage-soft px-4 py-3.5">
              <p className="text-sm font-semibold text-sage-deep">{t("common.seeDoctorHeading")}</p>
              <p className="mt-1 text-[17px] leading-[1.85] text-plum/80">
                {pickField<string>(lang, guide as unknown as Record<string, unknown>, "when_see_doctor")}
              </p>
            </div>
          )}

          {selfCheckCondition && <ConditionSelfCheck condition={selfCheckCondition as unknown as Record<string, unknown>} schema={schema} />}

          <div className="mt-8 rounded-2xl bg-blush/70 px-4 py-4 text-center">
            <p className="text-sm text-plum/70">{t("guides.moreQuestion")}</p>
            <Link
              href="/chat"
              className="mt-2 inline-block rounded-full bg-rose px-5 py-2 text-sm font-semibold text-accentink"
            >
              {t("common.askShokhi")}
            </Link>
          </div>

          {/* interactive tools keep sensitive choices practical, while the written guide stays short */}
          {id === "contraception" && <MethodFinder />}
          {(id === "contraception" || id === "missed_pill") && <PillHelper />}

          <p className="mt-6 text-xs leading-relaxed text-plum/45">{t("common.generalInfoNote")}</p>
        </article>
      )}
    </main>
  );
}
