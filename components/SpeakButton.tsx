"use client";

import { useEffect, useRef, useState } from "react";
import { speak as browserSpeak, stopSpeaking as browserStop } from "@/lib/speak";
import { useLang } from "./LanguageProvider";
import Icon from "./Icon";

const audioCache = new Map<string, Blob>();
const audioRequests = new Map<string, Promise<Blob>>();
const MAX_CACHED_AUDIO = 20;

function cacheKey(text: string, lang: string): string {
  return `${lang}:${text}`;
}

function loadAudio(text: string, lang: string): Promise<Blob> {
  const key = cacheKey(text, lang);
  const cached = audioCache.get(key);
  if (cached) return Promise.resolve(cached);

  const existing = audioRequests.get(key);
  if (existing) return existing;

  const request = fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("tts");
      return res.blob();
    })
    .then((blob) => {
      if (audioCache.size >= MAX_CACHED_AUDIO) {
        const oldest = audioCache.keys().next().value;
        if (typeof oldest === "string") audioCache.delete(oldest);
      }
      audioCache.set(key, blob);
      audioRequests.delete(key);
      return blob;
    })
    .catch((error) => {
      audioRequests.delete(key);
      throw error;
    });

  audioRequests.set(key, request);
  return request;
}

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
      const blob = await loadAudio(text, lang);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.preload = "auto";
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

  function prefetch() {
    if (state === "idle" && !audioCache.has(cacheKey(text, lang))) void loadAudio(text, lang).catch(() => {});
  }

  if (!text.trim()) return null;

  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const label = state === "playing" ? t("common.stopListen") : state === "loading" ? t("common.loading") : t("common.listen");

  return (
    <button
      onClick={toggle}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      aria-label={label}
      title={label}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full ring-1 ring-rose-soft transition
        ${state !== "idle" ? "animate-pulse bg-rose text-accentink" : "bg-surface text-rose-deep hover:bg-rose-mist"} ${className}`}
    >
      <Icon name={state === "playing" ? "stop" : "volume"} size={size === "sm" ? 13 : 15} />
    </button>
  );
}
