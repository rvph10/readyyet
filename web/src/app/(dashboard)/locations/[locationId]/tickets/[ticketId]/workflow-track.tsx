import { isEndedStatus } from "@readyyet/shared";
import { statusTone, toneIcons } from "@/components/status-pill";
import { Icon } from "@/components/ui/icon";

interface Step {
  code: string;
  label: string;
}

interface Props {
  // The path to READY, in order.
  steps: Step[];
  currentCode: string;
  // Where a stopped Ticket got to.
  reachedCode: string | null;
  label: string;
}

// ADR 0087: the current step is the only thing on the page that moves. It
// breathes in a loop, and a pulse leaves it toward the next step. A stopped
// Ticket's track stays still, faded where it got to.
export function WorkflowTrack({ steps, currentCode, reachedCode, label }: Props) {
  const ended = isEndedStatus(currentCode);
  const tone = statusTone(currentCode);
  const stopped = tone === "stopped";
  const at =
    currentCode === "COMPLETED"
      ? steps.length
      : steps.findIndex(({ code }) => code === (stopped ? reachedCode : currentCode));
  const fill =
    tone === "waiting" ? "bg-warning text-surface" : tone === "ready" ? "bg-brand text-ink" : "bg-pine text-surface";
  const ring = tone === "waiting" ? "bg-warning" : tone === "ready" ? "bg-brand" : "bg-pine";

  return (
    <ol aria-label={label} className={`md:flex ${stopped ? "opacity-60" : ""}`}>
      {steps.map((step, index) => {
        const done = index < at || (stopped && index === at);
        const current = index === at && !ended;
        return (
          <li
            key={step.code}
            aria-current={current ? "step" : undefined}
            className="relative flex min-h-14 min-w-0 flex-1 items-start gap-3 pb-3 md:flex-col md:items-center md:gap-2.5 md:pb-0 md:text-center"
          >
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-10 bottom-0 left-[1.125rem] w-1 overflow-hidden rounded-full md:top-[1.125rem] md:bottom-auto md:left-[calc(50%+1.625rem)] md:h-1 md:w-[calc(100%-3.25rem)] ${
                  done ? "bg-pine" : "bg-border-strong"
                }`}
              >
                {current && (
                  <span
                    className={`absolute inset-x-0 top-0 h-2/5 motion-safe:animate-now-flow-y md:inset-y-0 md:right-auto md:h-full md:w-2/5 md:motion-safe:animate-now-flow ${
                      tone === "waiting" ? "bg-warning" : "bg-pine"
                    }`}
                  />
                )}
              </span>
            )}
            <span className="relative flex size-10 shrink-0 items-center justify-center">
              {current && (
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 rounded-full motion-safe:animate-now-ring ${ring}`}
                />
              )}
              <span
                className={`relative flex size-10 items-center justify-center rounded-full ${
                  current ? fill : done ? "bg-pine text-brand" : "border-2 border-border-strong bg-surface"
                }`}
              >
                {current ? (
                  <Icon name={toneIcons[tone]} className="size-4" />
                ) : done ? (
                  <Icon name="check" className="size-3.5" />
                ) : null}
              </span>
            </span>
            <span
              className={`min-w-0 pt-2 text-label-xs wrap-anywhere md:px-1 md:pt-0 ${current ? "font-bold" : done ? "font-semibold" : "text-muted"}`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
