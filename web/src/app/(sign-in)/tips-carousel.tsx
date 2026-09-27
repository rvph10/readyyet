"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Tip {
  title: string;
  text: string;
  icon: ReactNode;
}

interface Props {
  tips: Tip[];
  label: string;
  nextLabel: string;
}

// The active tip's ring animation is the timer: when it ends, the next tip
// slides in. Hovering or focusing the carousel pauses it, and with reduced
// motion it never runs, so the button is the only way on.
export function TipsCarousel({ tips, label, nextLabel }: Props) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const next = () => setIndex((index + 1) % tips.length);

  useEffect(() => {
    const slide = track.current?.children[index] as HTMLElement | undefined;
    if (!track.current || !slide) {
      return;
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.current.scrollTo({ left: slide.offsetLeft, behavior: reduce ? "auto" : "smooth" });
  }, [index]);

  return (
    <section aria-label={label} className="group">
      <div ref={track} className="relative flex gap-14 overflow-hidden">
        {tips.map((tip, i) => (
          <div
            key={tip.title}
            inert={i !== index}
            className="relative w-full shrink-0 rounded-2xl border border-surface/20 bg-surface/15 p-5.5 backdrop-blur-md xl:pl-45"
          >
            {/* Where the tip's picture goes once there is one. */}
            <div className="absolute inset-y-4 left-4 hidden w-36 rounded-xl bg-surface/10 xl:block" />
            <div className="mb-2 flex items-center gap-3">
              <div className="flex size-10 shrink-0 -rotate-10 items-center justify-center rounded-xl border border-surface/20 bg-surface/15">
                {tip.icon}
              </div>
              <h2 className="text-label-lg">{tip.title}</h2>
              <button
                type="button"
                onClick={next}
                aria-label={nextLabel}
                className="ml-auto flex shrink-0 items-center gap-3 rounded-full text-label-lg tabular-nums"
              >
                {i + 1}/{tips.length}
                <svg viewBox="0 0 36 36" aria-hidden="true" className="size-6.5 -rotate-90">
                  <circle cx="18" cy="18" r="16" fill="none" strokeWidth="3" className="stroke-surface/20" />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    strokeDashoffset="100"
                    onAnimationEnd={next}
                    className={`stroke-surface ${
                      i === index
                        ? "animate-fill-ring group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none"
                        : ""
                    }`}
                  />
                </svg>
              </button>
            </div>
            <p className="line-clamp-2 min-h-12 text-label-sm text-surface/75">{tip.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
