"use client";

import { useTranslations } from "next-intl";
import { useRef, type InputHTMLAttributes } from "react";
import { Icon } from "./icon";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  // Said to screen readers only: the icon and placeholder say it on screen.
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// ADR 0059: a 44px pill, the height of a tab track, so it sits beside one
// in a list's toolbar. Its own clear button replaces the browser's, which
// each browser draws differently, and Escape clears it too.
export function SearchField({ label, value, onChange, className, ...props }: Props) {
  const t = useTranslations("common");
  const input = useRef<HTMLInputElement>(null);

  function clear() {
    onChange("");
    input.current!.focus();
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <Icon
        name="search"
        className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted"
      />
      <input
        ref={input}
        type="search"
        aria-label={label}
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            clear();
          }
        }}
        className="h-11 w-full rounded-full border border-border bg-surface pr-10 pl-10 text-label-sm text-ink transition placeholder:text-muted hover:border-border-strong focus:border-ink focus:ring-3 focus:ring-ink/10 focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label={t("clearSearch")}
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <Icon name="close" className="size-3" />
        </button>
      )}
    </div>
  );
}
