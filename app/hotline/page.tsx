"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Mascot3D from "@/components/Mascot3D";
import Message from "@/components/Message";
import Composer from "@/components/Composer";
import { useLang } from "@/components/LanguageProvider";
import { sendMessage, sendMessageStream } from "@/lib/api";
import { loadProfile, toChatProfile } from "@/lib/profile";
import type { ChatItem } from "@/lib/types";

export default function HotlinePage() {
  const { t, lang } = useLang();
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadProfile();
    setProfile(toChatProfile(saved));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, busy]);

  async function handleSend(text: string) {
    setBusy(true);
    setChat((items) => [...items, { role: "user", text }, { role: "assistant", text: "" }]);
    setHistory((items) => [...items, text]);
    let streamStarted = false;
    try {
      await sendMessageStream(text, profile, history, lang, {
        onMeta: (meta) => {
          streamStarted = true;
          setProfile(meta.profile);
          setChat((items) => {
            const next = [...items];
            next[next.length - 1] = { ...next[next.length - 1], data: meta as any };
            return next;
          });
        },
        onDelta: (chunk) => {
          streamStarted = true;
          setChat((items) => {
            const next = [...items];
            next[next.length - 1] = { ...next[next.length - 1], text: next[next.length - 1].text + chunk };
            return next;
          });
        },
      });
    } catch {
      if (streamStarted) {
        setChat((items) => [...items.slice(0, -1), { role: "assistant", text: t("chat.errorConnect") }]);
      } else {
        try {
          const result = await sendMessage(text, profile, history, lang);
          setProfile(result.profile);
          setChat((items) => [...items.slice(0, -1), { role: "assistant", text: result.guidance, data: result }]);
        } catch {
          setChat((items) => [...items.slice(0, -1), { role: "assistant", text: t("chat.errorConnect") }]);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const started = chat.length > 0;
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <PageHeader icon="☎️" title={t("hotline.title")} sub={t("hotline.sub")} />

      {!started ? (
        <section className="mt-8 rounded-3xl bg-gradient-to-br from-panel to-panel-deep px-6 py-10 text-center text-white shadow-soft">
          <Mascot3D variant="hotline" size={150} />
          <p className="mt-3 text-sm text-white/70">{t("hotline.anyPhone")}</p>
          <h1 className="mt-1 font-display text-2xl font-bold">{t("hotline.brand")}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/80">{t("hotline.brandDesc")}</p>
          <div className="mx-auto mt-7 max-w-xl text-left">
            <Composer onSend={handleSend} busy={busy} />
          </div>
          <p className="mt-4 text-xs text-white/60">{lang === "bn" ? "মাইক্রোফোনে বলুন, সখীর উত্তর শুনুন।" : "Speak into the microphone and listen to Shokhi’s reply."}</p>
        </section>
      ) : (
        <section className="mt-6 flex h-[calc(100vh-13rem)] flex-col rounded-3xl bg-surface/70 px-4 shadow-soft ring-1 ring-rose-soft">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-5">
            {chat.map((item, index) => item.text.trim() && <Message key={index} item={item} />)}
            {busy && <p className="text-center text-sm text-plum/50">{t("chat.thinking")}</p>}
          </div>
          <div className="border-t border-rose-soft/60 py-3">
            <Composer onSend={handleSend} busy={busy} />
          </div>
        </section>
      )}

      <div className="mt-6 rounded-2xl bg-apricot-soft px-5 py-4 text-center">
        <p className="text-sm font-semibold text-rose-deep">{t("hotline.needEmergency")}</p>
        <p className="mt-1 text-sm text-plum/70">{t("hotline.emergencyLine")}</p>
      </div>
      <div className="mt-6 text-center">
        <Link href="/chat" className="text-sm font-semibold text-rose hover:underline">{t("hotline.preferText")}</Link>
      </div>
    </main>
  );
}
