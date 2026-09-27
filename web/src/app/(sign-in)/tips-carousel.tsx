"use client";

import { useState } from "react";

interface Tip {
  title: string;
  text: string;
}

interface Props {
  tips: Tip[];
  label: string;
  nextLabel: string;
}

// The ring's animation is the timer: when it ends, the next tip shows and the
// ring, keyed by the index, starts over. Hovering or focusing the card pauses
// it, and with reduced motion it never runs, so the button is the only way on.
export function TipsCarousel({ tips, label, nextLabel }: Props) {
  const [index, setIndex] = useState(0);
  const next = () => setIndex((index + 1) % tips.length);
  const tip = tips[index];

  return (
    <section aria-label={label} className="group flex gap-4 rounded-xl bg-surface p-4 text-ink">
      {/* Where the tip's picture goes once there is one. */}
      <div className="size-20 shrink-0 rounded-lg bg-subtle" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold">{tip.title}</h2>
          <button
            type="button"
            onClick={next}
            aria-label={nextLabel}
            className="-mt-1 -mr-1 flex h-7 shrink-0 items-center gap-2 rounded-lg px-1 text-xs font-medium text-muted tabular-nums hover:text-ink"
          >
            {index + 1}/{tips.length}
            <svg key={index} viewBox="0 0 20 20" aria-hidden="true" className="size-4 -rotate-90">
              <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" className="stroke-border" />
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                strokeWidth="2.5"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset="100"
                onAnimationEnd={next}
                className="animate-fill-ring stroke-ink group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-muted">{tip.text}</p>
      </div>
    </section>
  );
}
