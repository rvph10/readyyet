"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const sides = {
  below:
    "top-full mt-2 -translate-y-1 before:bottom-full after:bottom-full after:border-b-ink group-hover:translate-y-0 group-focus-visible:translate-y-0",
  above:
    "bottom-full mb-2 translate-y-1 before:top-full after:top-full after:border-t-ink group-hover:translate-y-0 group-focus-visible:translate-y-0",
};

// A dark hint that shows under its trigger on hover or keyboard focus, or
// over it when there's no room below. The trigger is the nearest
// `group relative` ancestor, a button or link, so the hint is part of its
// accessible name and clicking the hint clicks it. Escape hides it until the
// next hover or focus, as WCAG 1.4.13 asks (ADR 0057). Near either edge of
// the screen it lines up with that side of its trigger instead of centring,
// since even hidden it would widen the page (ADR 0064).
// A wide one wraps, for a sentence rather than a label. One whose trigger
// sits at the end of something, like a field's question mark, lines up with
// that end wherever it is.
export function Tooltip({ wide, end, children }: { wide?: boolean; end?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [side, setSide] = useState<keyof typeof sides>("below");

  useEffect(() => {
    const hint = ref.current!;
    const trigger = hint.parentElement!;
    function align() {
      const { left, right } = trigger.getBoundingClientRect();
      const reach = (hint.offsetWidth - (right - left)) / 2 + 8;
      const width = document.documentElement.clientWidth;
      hint.dataset.align = end || right + reach > width ? "end" : left - reach < 0 ? "start" : "center";
    }
    align();
    function show() {
      align();
      setDismissed(false);
      const room = window.innerHeight - trigger.getBoundingClientRect().bottom;
      setSide(room < hint.offsetHeight + 16 ? "above" : "below");
    }
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") setDismissed(true);
    }
    trigger.addEventListener("pointerenter", show);
    trigger.addEventListener("focusin", show);
    document.addEventListener("keydown", dismiss);
    return () => {
      trigger.removeEventListener("pointerenter", show);
      trigger.removeEventListener("focusin", show);
      document.removeEventListener("keydown", dismiss);
    };
  }, [end]);

  return (
    <span
      ref={ref}
      className={`pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 items-center data-[align=end]:right-0 data-[align=end]:left-auto data-[align=end]:translate-x-0 data-[align=start]:left-0 data-[align=start]:translate-x-0 data-[align=end]:after:right-4.5 data-[align=end]:after:left-auto data-[align=end]:after:translate-x-0 data-[align=start]:after:left-4.5 data-[align=start]:after:translate-x-0 gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-surface opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-visible:opacity-100 before:absolute before:inset-x-0 before:h-2 after:absolute after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent ${wide ? "w-64 text-left text-p-xs" : "text-label-xs whitespace-nowrap"} ${sides[side]} ${dismissed ? "invisible" : ""}`}
    >
      {children}
    </span>
  );
}
