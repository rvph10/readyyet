import { useTranslations } from "next-intl";
import { Icon } from "./icon";

interface Props {
  // The steps' names, in order.
  steps: string[];
  // 1-based, as the form counts them.
  current: number;
  // Like "Step 1 of 2", for screen readers to announce the list by.
  label: string;
}

// Where a form with several pages stands: numbered bubbles drawn like a
// Workflow's (ADR 0054), in ink only, since a form's steps have no Status.
export function Steps({ steps, current, label }: Props) {
  const t = useTranslations("common");
  return (
    <ol aria-label={label} className="flex">
      {steps.map((name, index) => {
        const number = index + 1;
        const done = number < current;
        const isCurrent = number === current;
        return (
          <li
            key={name}
            aria-current={isCurrent ? "step" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 last:flex-none"
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-label-xs ${
                done
                  ? "bg-ink text-surface"
                  : isCurrent
                    ? "bg-ink text-surface ring-4 ring-ink/10"
                    : "border-2 border-border bg-surface text-muted"
              }`}
            >
              {done ? <Icon name="check" className="size-3" /> : number}
            </span>
            <span
              className={`shrink-0 text-label-sm whitespace-nowrap ${isCurrent ? "font-semibold text-ink" : "text-muted"}`}
            >
              {name}
              {done && <span className="sr-only">, {t("stepDone")}</span>}
            </span>
            {number < steps.length && (
              <span className={`mx-1 h-0.5 min-w-4 flex-1 rounded-full ${done ? "bg-ink" : "bg-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
