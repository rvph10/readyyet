import { useTranslations } from "next-intl";
import { Icon } from "./ui/icon";
import { statusTone, type StatusTone } from "./status-pill";

export interface WorkflowStep {
  code: string;
  label: string;
  // When the Ticket reached it, already formatted. Upcoming steps have none.
  at?: string;
}

interface Props {
  // The path to show, in order. A stopped Ticket's steps end at its
  // CANCELLED or REJECTED, the ones it never reached left out.
  steps: WorkflowStep[];
  currentCode: string;
  orientation?: "vertical" | "horizontal";
  // Vertical only, the steps share the height of a flex column they're in.
  fill?: boolean;
}

type State = "done" | "current" | "upcoming";

// The current step's label stands out in weight too, not only its marker's
// colour (ADR 0057).
const labelClasses: Record<State, string> = {
  done: "text-ink",
  current: "font-semibold text-ink",
  upcoming: "text-muted",
};

// Done is only drawn as a check, so it's also said. aria-current marks the
// current step, and upcoming is what's left.
function StepLabel({ state, label, className }: { state: State; label: string; className?: string }) {
  const t = useTranslations("common");
  return (
    <p className={`text-label-sm transition-colors duration-300 ${labelClasses[state]} ${className ?? ""}`}>
      {label}
      {state === "done" && <span className="sr-only">, {t("stepDone")}</span>}
    </p>
  );
}

const currentMarkers: Record<StatusTone, string> = {
  received: "bg-status-received ring-status-received/40",
  working: "bg-status-working ring-status-working/40",
  waiting: "bg-status-waiting ring-status-waiting/40",
  ready: "bg-brand ring-brand/45",
  completed: "bg-ink ring-ink/15",
  stopped: "bg-status-stopped ring-status-stopped/40",
};

function Marker({ state, code }: { state: State; code: string }) {
  if (state === "done") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-surface transition duration-300">
        <Icon name="check" className="size-3" />
      </span>
    );
  }
  if (state === "current") {
    const tone = statusTone(code);
    return (
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full ring-4 transition duration-300 ${currentMarkers[tone]}`}
      >
        {tone === "ready" || tone === "completed" ? (
          <Icon name="check" className={`size-3 ${tone === "ready" ? "text-ink" : "text-surface"}`} />
        ) : (
          <span className="size-2 rounded-full bg-ink" />
        )}
      </span>
    );
  }
  return <span className="size-6 shrink-0 rounded-full border-2 border-border bg-surface transition duration-300" />;
}

// Where a Ticket stands in its Workflow: done steps in ink, the current one
// in its Status tone (ADR 0054 and 0061), the rest outlined. Each change of
// step fades, for a Ticket moving on while it's watched.
export function WorkflowSteps({ steps, currentCode, orientation = "vertical", fill }: Props) {
  const currentIndex = steps.findIndex((step) => step.code === currentCode);
  const stateOf = (index: number): State =>
    index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";

  if (orientation === "horizontal") {
    return (
      <ol className="flex">
        {steps.map((step, index) => {
          const state = stateOf(index);
          return (
            <li
              key={step.code}
              aria-current={state === "current" ? "step" : undefined}
              className="min-w-0 flex-1 last:flex-none"
            >
              <div className="flex items-center">
                <Marker state={state} code={step.code} />
                {index < steps.length - 1 && (
                  <span
                    className={`mx-2 h-0.5 flex-1 rounded-full transition-colors duration-300 ${state === "done" ? "bg-ink" : "bg-border"}`}
                  />
                )}
              </div>
              <StepLabel state={state} label={step.label} className="mt-2 truncate pr-3" />
              {step.at && <p className="truncate pr-3 text-p-xs text-muted">{step.at}</p>}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={fill ? "flex grow flex-col" : undefined}>
      {steps.map((step, index) => {
        const state = stateOf(index);
        return (
          <li
            key={step.code}
            aria-current={state === "current" ? "step" : undefined}
            className={`relative flex gap-3 pb-6 last:pb-0 ${fill ? "grow last:grow-0" : ""}`}
          >
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-6.5 bottom-0.5 left-[0.6875rem] w-0.5 rounded-full transition-colors duration-300 ${state === "done" ? "bg-ink" : "bg-border"}`}
              />
            )}
            <Marker state={state} code={step.code} />
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pt-0.5">
              <StepLabel state={state} label={step.label} />
              {step.at && <p className="shrink-0 text-p-xs text-muted">{step.at}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
