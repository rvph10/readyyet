"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

interface Copy {
  shop: string;
  item: string;
  progress: string;
  steps: string[];
  quote: { title: string; text: string };
  ready: { title: string; text: string };
}

const STEP_MS = 1900;
// Where the quote's email shows: the step that waits for the Customer's answer.
const QUOTE_STEP = 2;

// ReadyYet's own tracking page, drawn and played rather than photographed: an
// item moves through its steps, the emails the Customer gets pop up, and it
// starts again. Reduced motion shows it ready and still.
export function Showcase({ copy }: { copy: Copy }) {
  const last = copy.steps.length - 1;
  const [step, setStep] = useState(last);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // From ready, a beat on it, then from the start.
    const timer = setInterval(() => setStep((current) => (current >= last + 1 ? 0 : current + 1)), STEP_MS);
    return () => clearInterval(timer);
  }, [last]);

  // One beat past the last step, so "ready" holds before it starts over.
  const shown = Math.min(step, last);
  const ready = shown === last;

  return (
    <div aria-hidden="true" className="relative mx-auto w-[min(20rem,80%)] text-ink">
      <div className="rounded-[2rem] border-[6px] border-ink bg-subtle p-3">
        <div className="mx-auto mb-3 h-5 w-20 rounded-full bg-ink" />
        <div className="flex items-center gap-2 px-1">
          <span className="flex size-7 items-center justify-center rounded-lg bg-pine text-label-xs text-brand">
            AL
          </span>
          <span className="text-label-sm">{copy.shop}</span>
        </div>
        <div className={`mt-3 rounded-2xl p-4 transition-colors duration-500 ${ready ? "bg-brand" : "bg-surface"}`}>
          <p className="text-p-xs text-muted">{copy.item}</p>
          <p key={shown} className="mt-1 animate-[showcase-in_0.5s_var(--ease-enter)] text-title-h5">
            {copy.steps[shown]}
          </p>
        </div>
        <div className="mt-2 rounded-2xl bg-surface p-4">
          <p className="mb-3 text-label-xs">{copy.progress}</p>
          <ol className="flex flex-col gap-2.5">
            {copy.steps.map((label, index) => (
              <li key={label} className="flex items-center gap-2.5 text-p-xs">
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500 ${
                    index < shown
                      ? "border-pine bg-pine text-brand"
                      : index === shown
                        ? "border-pine bg-brand"
                        : "border-border-strong"
                  }`}
                >
                  {index < shown && <Icon name="check" className="size-2" />}
                </span>
                <span className={index <= shown ? "text-ink" : "text-muted"}>{label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <Notice shown={shown === QUOTE_STEP} className="-left-16 top-24" icon="message" copy={copy.quote} />
      <Notice shown={ready} className="-right-14 bottom-16" icon="check" copy={copy.ready} lime />
    </div>
  );
}

function Notice({
  shown,
  className,
  icon,
  copy,
  lime = false,
}: {
  shown: boolean;
  className: string;
  icon: "message" | "check";
  copy: { title: string; text: string };
  lime?: boolean;
}) {
  return (
    <div
      className={`absolute flex w-56 items-center gap-3 rounded-2xl p-3 transition-[opacity,translate,scale] duration-500 ease-(--ease-enter) ${className} ${
        lime ? "bg-brand text-ink" : "bg-surface text-ink"
      } ${shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"}`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${lime ? "bg-pine text-brand" : "bg-brand"}`}
      >
        <Icon name={icon} className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-label-sm">{copy.title}</span>
        <span className="block text-p-xs text-muted">{copy.text}</span>
      </span>
    </div>
  );
}
