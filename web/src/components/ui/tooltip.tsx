import type { ReactNode } from "react";

// A dark hint that shows under its trigger on hover or keyboard focus. The
// trigger is the nearest `group relative` ancestor, a button or link, so the
// hint is part of its accessible name and clicking the hint clicks it.
export function Tooltip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute top-full left-1/2 z-10 mt-2 flex -translate-x-1/2 -translate-y-1 items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-label-xs whitespace-nowrap text-surface opacity-0 shadow-float transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 before:absolute before:inset-x-0 before:bottom-full before:h-2 after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-ink">
      {children}
    </span>
  );
}
