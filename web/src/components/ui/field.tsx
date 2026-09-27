import { CircleAlert } from "lucide-react";
import { useId, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  // For a form whose heading already says what the field is for.
  hideLabel?: boolean;
  error?: string | null;
}

// ADR 0049: a 48px input with its own error under it. Forms set noValidate
// and show their errors here, not in the browser's bubbles, which follow the
// browser's language rather than the page's and can't be styled.
export function Field({ label, hideLabel, error, className, ...props }: Props) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1.5 block text-label-sm"}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
        className={`h-12 w-full rounded-xl border bg-surface px-4 text-label-md text-ink transition placeholder:text-muted/70 focus-visible:outline-none ${
          error
            ? "border-red-700 focus:ring-3 focus:ring-red-700/15"
            : "border-border hover:border-border-strong focus:border-highlight"
        }`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 flex gap-1.5 text-p-sm text-red-700">
          <CircleAlert aria-hidden="true" strokeWidth={1.5} className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

type Problem = "valueMissing" | "typeMismatch" | "patternMismatch";

// The first problem the browser's own check finds with an input, in the
// page's words, in the order the messages are given. Null when it's valid.
export function validityMessage(input: HTMLInputElement, messages: Partial<Record<Problem, string>>) {
  const problem = (Object.keys(messages) as Problem[]).find((key) => input.validity[key]);
  return problem ? (messages[problem] ?? null) : null;
}
