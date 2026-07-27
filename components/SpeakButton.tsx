"use client";

import { useEffect, useRef, useState } from "react";
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
    if (!res.ok) throw new Error(`tts:${res.status}`);
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

/** Natural hosted read-aloud, with a device-only fallback for local/private mode. */
export default function SpeakButton({
  text,
  size = "md",
  className = "",
  withLabel = false,
}: {
  text: string;
  size?: "sm" | "md";
  className?: string;
  withLabel?: boolean;
}) {
  const { t, lang } = useLang();
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [text, lang]);

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
      player.onerror = () => {
        setState("error");
        player.pause();
        URL.revokeObjectURL(url);
        audioRef.current = null;
        audioUrlRef.current = null;
      };
      audioRef.current = player;
      audioUrlRef.current = url;
      await player.play();
      setState("playing");
    } catch {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_`]/g, ""));
        utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
        utterance.onend = () => setState("idle");
        utterance.onerror = () => setState("error");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setState("playing");
      } else setState("error");
    }
  }

  function toggle() {
    if (state === "loading" || state === "playing") {
      audioRef.current?.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
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
  const label = state === "playing"
    ? t("common.stopListen")
    : state === "loading"
      ? t("common.loading")
      : state === "error"
        ? t("common.voiceUnavailable")
        : t("common.listen");

  return (
    <button
      onClick={toggle}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      aria-label={label}
      title={label}
      className={`inline-flex ${dim} ${withLabel ? "w-auto gap-1.5 px-2" : "shrink-0 justify-center"} items-center rounded-full ring-1 ring-rose-soft transition
        ${state === "playing" || state === "loading" ? "animate-pulse bg-rose text-accentink" : "bg-surface text-rose-deep hover:bg-rose-mist"} ${className}`}
    >
      <Icon name={state === "playing" ? "stop" : "volume"} size={size === "sm" ? 13 : 15} />
      {withLabel && <span className="text-xs font-semibold">{label}</span>}
    </button>
  );
}
