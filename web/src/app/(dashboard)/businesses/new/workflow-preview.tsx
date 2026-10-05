"use client";

import { useEffect, useState } from "react";
import { WorkflowSteps, type WorkflowStep } from "@/components/workflow-steps";

const STEP_MS = 1200;
const HOLD_MS = 2000;
const FADE_MS = 400;

interface Props {
  title: string;
  caption: string;
  steps: WorkflowStep[];
}

// A Business type's default Workflow, played as a Ticket going through it:
// one step at a time to the end, a pause, then a fade back to the start.
// Like the sign-in tips, hovering or focusing it pauses it, and with reduced
// motion it stays on the first step (ADR 0069). The parent keys it by
// Business type, so a new choice starts over and fades in.
export function WorkflowPreview({ title, caption, steps }: Props) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const atEnd = index === steps.length - 1;
    // Faded out, the steps go back to the start unseen, then fade back in.
    const [delay, next] = fading
      ? atEnd
        ? [FADE_MS, () => setIndex(0)]
        : [FADE_MS, () => setFading(false)]
      : atEnd
        ? [HOLD_MS, () => setFading(true)]
        : [STEP_MS, () => setIndex(index + 1)];
    const timer = setTimeout(next, delay);
    return () => clearTimeout(timer);
  }, [index, fading, paused, steps.length]);

  return (
    <section
      aria-label={title}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="rounded-2xl bg-subtle p-4 transition-opacity duration-500 starting:opacity-0"
    >
      <h2 className="mb-4 text-label-sm">{title}</h2>
      <div className={`transition-opacity duration-400 ${fading ? "opacity-0" : ""}`}>
        <WorkflowSteps steps={steps} currentCode={steps[index].code} />
      </div>
      <p className="mt-4 text-p-xs text-muted">{caption}</p>
    </section>
  );
}
