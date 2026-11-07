"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icon";

// How long the button shows its check before it offers to copy again.
const COPIED_FOR_MS = 2000;

interface Props {
  label: string;
  value: string;
  // What's read on screen when it differs from what's copied.
  shown?: string;
  // For a code, where telling O from 0 matters.
  mono?: boolean;
  className?: string;
}

// ADR 0090: a value to hand on, its label over it on a soft fill, with a round
// button that turns lime with a check once copied. Clicking the value selects
// it all, so it can still be copied by hand where the clipboard is refused.
export function CopyField({ label, value, shown, mono, className }: Props) {
  const t = useTranslations("common");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      input.current!.select();
    }
  }

  return (
    <div className={`flex items-center gap-2 rounded-2xl bg-subtle py-2 pr-2 pl-3.5 ${className ?? ""}`}>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-p-xs text-muted">
          {label}
        </label>
        <input
          ref={input}
          id={id}
          readOnly
          value={shown ?? value}
          onFocus={(event) => event.target.select()}
          className={`w-full truncate bg-transparent text-ink focus-visible:outline-none ${mono ? "font-mono text-label-xs font-semibold" : "text-label-sm"}`}
        />
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`${t("copy")}: ${label}`}
        title={t("copy")}
        className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[background-color,scale] active:scale-[0.97] ${
          copied ? "bg-brand text-ink" : "border border-border-strong bg-surface text-ink hover:bg-canvas"
        }`}
      >
        <Icon name={copied ? "check" : "clone"} className="size-3.5" />
      </button>
      <p aria-live="polite" className="sr-only">
        {copied ? t("copied") : ""}
      </p>
    </div>
  );
}
