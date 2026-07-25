"use client";

import { useEffect, useRef, useState } from "react";
import { speak as browserSpeak, stopSpeaking as browserStop, warmVoices } from "@/lib/speak";
import { useLang } from "./LanguageProvider";
import Icon from "./Icon";

const audioCache = new Map<string, Blob>();
const audioRequests = new Map<string, Promise<Blob>>();

function keyFor(text: string, lang: string): string {
  return `${lang}:${text}`;
}

function loadAudio(text: string, lang: string): Promise<Blob> {
  const key = keyFor(text, lang);
  const cached = audioCache.get(key);
  if (cached) return Promise.resolve(cached);
  const existing = audioRequests.get(key);
  if (existing) return existing;
  const request = fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  }).then((res) => {
    if (!res.ok) throw new Error("tts");
    return res.blob();
  }).then((blob) => {
    audioCache.set(key, blob);
    audioRequests.delete(key);
    return blob;
  }).catch((error) => {
    audioRequests.delete(key);
    throw error;
  });
  audioRequests.set(key, request);
  return request;
}

/**
 * Natural female neural read-aloud when configured, with browser SpeechSynthesis as an offline
 * fallback. Audio is cached per message so repeated listens start immediately.
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
  const audioUrlRef = useRef<string | null>(null);
  useEffect(() => {
    warmVoices();
    if (text.trim()) void loadAudio(text, lang).catch(() => {});
    return () => {
      browserStop();
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [text, lang]);

  function fallback() {
    const ok = browserSpeak(text, lang, () => setState("idle"));
    setState(ok ? "playing" : "idle");
  }

  async function play() {
    setState("loading");
    try {
      const blob = await loadAudio(text, lang);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob);
      const player = new Audio(url);
      player.preload = "auto";
      player.onended = () => {
        setState("idle");
        player.pause();
        URL.revokeObjectURL(url);
        audioRef.current = null;
        audioUrlRef.current = null;
      };
      player.onerror = fallback;
      audioRef.current = player;
      audioUrlRef.current = url;
      await player.play();
      setState("playing");
    } catch {
      fallback();
    }
  }

  function toggle() {
    if (state !== "idle") {
      browserStop();
      audioRef.current?.pause();
      setState("idle");
      return;
    }
    void play();
  }

  function prefetch() {
    if (state === "idle" && !audioCache.has(keyFor(text, lang))) void loadAudio(text, lang).catch(() => {});
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
