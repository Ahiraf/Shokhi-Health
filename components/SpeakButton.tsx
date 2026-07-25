"use client";

import { useEffect, useState } from "react";
import { speak as browserSpeak, stopSpeaking as browserStop, warmVoices } from "@/lib/speak";
import { useLang } from "./LanguageProvider";
import Icon from "./Icon";

/**
 * Instant, offline read-aloud using the device's speech engine. It avoids a network round-trip,
 * and prefers a female Bangla/English voice when the device exposes one.
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
  useEffect(() => {
    warmVoices();
    return () => browserStop();
  }, []);

  function toggle() {
    if (state !== "idle") {
      browserStop();
      setState("idle");
      return;
    }
    setState("loading");
    const ok = browserSpeak(text, lang, () => setState("idle"));
    setState(ok ? "playing" : "idle");
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
