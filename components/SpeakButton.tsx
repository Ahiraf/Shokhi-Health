"use client";

import { useEffect, useRef, useState } from "react";
import { speak as browserSpeak, stopSpeaking as browserStop } from "@/lib/speak";
import { useLang } from "./LanguageProvider";
import Icon from "./Icon";

/**
 * "Listen" button. Primary path: GOOGLE neural TTS (/api/tts) — fluent, correctly-pronounced
 * Bangla/English (unlike the browser's robotic voice). Falls back to the browser's SpeechSynthesis
 * when the neural voice is unavailable (offline / no key).
 */
export default function SpeakButton({
  text,
  size = "md",
  className = "",
}: {
  text: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const { t, lang } = useLang();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  function cleanup() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    browserStop();
  }
  useEffect(() => () => cleanup(), []);

  function fallback() {
    const ok = browserSpeak(text, lang, () => setState("idle"));
    setState(ok ? "playing" : "idle");
  }

  async function play() {
    setState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (!res.ok) throw new Error("tts");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setState("idle"); cleanup(); };
      audio.onerror = () => fallback();
      await audio.play();
      setState("playing");
    } catch {
      fallback();
    }
  }

  function toggle() {
    if (state !== "idle") {
      cleanup();
      setState("idle");
      return;
    }
    void play();
  }

  if (!text.trim()) return null;

  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const label = state === "playing" ? t("common.stopListen") : state === "loading" ? t("common.loading") : t("common.listen");

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full ring-1 ring-rose-soft transition
        ${state !== "idle" ? "animate-pulse bg-rose text-accentink" : "bg-surface text-rose-deep hover:bg-rose-mist"} ${className}`}
    >
      <Icon name={state === "playing" ? "stop" : "volume"} size={size === "sm" ? 13 : 15} />
    </button>
  );
}
