"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "./button";
import { Icon } from "./icon";

// How long the button says "Copied" before it offers to copy again.
const COPIED_FOR_MS = 2000;

// ADR 0059: a value to hand on, like a Ticket's tracking link, read-only in
// a field with a Copy button inside it. Clicking the field selects it all,
// so it can still be copied by hand where the clipboard is refused.
export function CopyField({ label, value, className }: { label: string; value: string; className?: string }) {
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
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-label-sm">
        {label}
      </label>
      <div className="relative">
        <input
          ref={input}
          id={id}
          readOnly
          value={value}
          onFocus={(event) => event.target.select()}
          className="h-12 w-full truncate rounded-xl border border-border bg-subtle pr-28 pl-4 font-mono text-p-sm text-ink transition hover:border-border-strong focus:border-ink focus:ring-3 focus:ring-ink/10 focus-visible:outline-none"
        />
        <Button variant="secondary" size="sm" onClick={() => void copy()} className="absolute top-2 right-2">
          <Icon name={copied ? "check" : "link"} className="size-3" />
          {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? t("copied") : ""}
      </p>
    </div>
  );
}
