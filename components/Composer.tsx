"use client";

import { useRef, useState } from "react";
import { useLang } from "./LanguageProvider";

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export default function Composer({
  onSend,
  busy,
}: {
  onSend: (text: string) => void;
  busy: boolean;
}) {
  const { t, lang } = useLang();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  function submit() {
    const val = text.trim();
    if (!val || busy) return;
    onSend(val);
    setText("");
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  function startRecording() {
    if (recognitionRef.current) return;
    setVoiceError("");
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition as SpeechRecognitionConstructor | undefined;
    if (!Recognition) {
      setVoiceError(t("composer.voiceNoSupport"));
      return;
    }
    const recognition = new Recognition();
    recognition.lang = lang === "bn" ? "bn-BD" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0]?.transcript || "";
      if (transcript.trim()) setText(transcript.trim());
    };
    recognition.onerror = (event: any) => {
      setVoiceError(event.error === "not-allowed" ? t("composer.micDenied") : t("composer.transcribeFailed"));
      recognitionRef.current = null;
      setRecording(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setRecording(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  function toggleVoice() {
    if (busy) return;
    if (recording) stopRecording();
    else void startRecording();
  }

  const micIcon = recording ? "⏹" : "🎙";
  const micTitle = recording ? t("composer.listening") : t("composer.voiceTitle");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <button
          onClick={toggleVoice}
          disabled={busy}
          title={micTitle}
          aria-label={micTitle}
          aria-pressed={recording}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl shadow-soft transition
            ${recording ? "animate-pulse bg-red-500 text-white" : "bg-surface text-rose ring-1 ring-rose-soft hover:bg-rose-mist"}
            disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {micIcon}
        </button>

        <div className="flex flex-1 items-end gap-2 rounded-3xl bg-surface p-1.5 shadow-soft ring-1 ring-rose-soft focus-within:ring-2 focus-within:ring-rose/40">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={t("composer.placeholder")}
            className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2.5 text-plum outline-none placeholder:text-plum/40"
          />
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className="flex h-10 items-center gap-1 rounded-full bg-gradient-to-br from-rose to-rose-deep px-5 font-semibold text-accentink shadow-lift transition hover:brightness-105 disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? "…" : t("composer.send")}
          </button>
        </div>
      </div>

      {(recording || voiceError) && (
        <p className="px-1 text-xs leading-snug text-plum/55">
          {voiceError
            ? voiceError
            : t("composer.listening")}
        </p>
      )}
    </div>
  );
}
