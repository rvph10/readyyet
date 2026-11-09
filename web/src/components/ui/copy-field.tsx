"use client";

import { useTranslations } from "next-intl";
import { useId, useRef } from "react";
import { Icon } from "./icon";
import { useCopy } from "./use-copy";

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
  const { copied, copy: copyValue } = useCopy();

  async function copy() {
    if (!(await copyValue(value))) input.current!.select();
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
