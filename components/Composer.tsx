"use client";

import { useState } from "react";
import { useLang } from "./LanguageProvider";

export default function Composer({
  onSend,
  busy,
}: {
  onSend: (text: string) => void;
  busy: boolean;
}) {
  const { t } = useLang();
  const [text, setText] = useState("");

  function submit() {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText("");
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-1 items-end gap-2 rounded-3xl bg-surface p-1.5 shadow-soft ring-1 ring-rose-soft focus-within:ring-2 focus-within:ring-rose/40">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
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
  );
}
