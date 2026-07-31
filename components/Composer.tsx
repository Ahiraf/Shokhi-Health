"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./LanguageProvider";

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
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
  onVoiceBridge,
}: {
  onSend: (text: string) => void;
  busy: boolean;
  onVoiceBridge?: (blob: Blob) => void;
}) {
  const { t, lang } = useLang();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  function submit() {
    const val = text.trim();
    if (!val || busy) return;
    onSend(val);
    setText("");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    recognitionRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "advice.webm");
      form.append("lang", lang);
      const response = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await response.json() as { transcript?: string };
      if (!response.ok || !data.transcript?.trim()) throw new Error("transcription failed");
      setText(data.transcript.trim());
    } catch {
      setVoiceError(t("composer.transcribeFailed"));
    } finally {
      setTranscribing(false);
    }
  }

  async function startBrowserFallback() {
    if (recognitionRef.current) return;
    setVoiceError("");
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError(t("composer.voiceNoSupport"));
      return;
    }
    const recognition = new Recognition();
    recognition.lang = lang === "bn" ? "bn-BD" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setRecording(true);
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
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setRecording(false);
      setVoiceError(t("composer.transcribeFailed"));
    }
  }

  async function startRecording() {
    setVoiceError("");
    // Recorded audio is sent only to an explicitly configured local ASR service. If recording
    // is unavailable, use the browser SpeechRecognition path below.
    if (typeof navigator.mediaDevices?.getUserMedia === "function" && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
        audioChunksRef.current = [];
        streamRef.current = stream;
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        recorder.onstart = () => setRecording(true);
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          recorderRef.current = null;
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          audioChunksRef.current = [];
          if (blob.size > 0) {
            if (onVoiceBridge) onVoiceBridge(blob);
            else void transcribe(blob);
          }
          else setVoiceError(t("composer.voiceNoSpeech"));
        };
        recorder.onerror = () => {
          stream.getTracks().forEach((track) => track.stop());
          recorderRef.current = null;
          streamRef.current = null;
          setRecording(false);
          setVoiceError(t("composer.micFailed"));
        };
        recorder.start();
        return;
      } catch (error: any) {
        if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
          setVoiceError(t("composer.micDenied"));
          return;
        }
        // Try the local browser recognizer if audio recording is not available on this device.
      }
    }
    await startBrowserFallback();
  }

  useEffect(() => () => {
    recorderRef.current?.stop();
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function toggleVoice() {
    if (busy || transcribing) return;
    if (recording) stopRecording();
    else void startRecording();
  }

  const micIcon = transcribing ? "…" : recording ? "⏹" : "🎙";
  const micTitle = transcribing ? t("composer.transcribing") : recording ? t("composer.listening") : t("composer.voiceTitle");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <button
          onClick={toggleVoice}
          disabled={busy || transcribing}
          title={micTitle}
          aria-label={micTitle}
          aria-pressed={recording}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl shadow-soft transition
            ${recording ? "animate-pulse bg-red-500 text-white" : transcribing ? "bg-rose-mist text-rose" : "bg-surface text-rose ring-1 ring-rose-soft hover:bg-rose-mist"}
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

      {(recording || transcribing || voiceError) && (
        <p className="px-1 text-xs leading-snug text-plum/55">
          {voiceError
            ? voiceError
            : transcribing ? t("composer.transcribing") : t("composer.listening")}
        </p>
      )}
    </div>
  );
}
