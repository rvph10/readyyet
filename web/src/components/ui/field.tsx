import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Icon } from "./icon";

interface FrameProps {
  label: string;
  // For a form whose heading already says what the field is for.
  hideLabel?: boolean;
  error?: string | null;
  className?: string;
}

// ADR 0049 and 0053: 48px controls with their own error under them. Forms set
// noValidate and show their errors here, not in the browser's bubbles, which
// follow the browser's language rather than the page's and can't be styled.
function controlClass(error: string | null | undefined) {
  return `w-full rounded-xl border bg-surface text-label-md text-ink transition placeholder:text-muted/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted ${
    error
      ? "border-red-700 focus:ring-3 focus:ring-red-700/15"
      : "border-border hover:border-border-strong focus:border-ink focus:ring-3 focus:ring-ink/10 disabled:hover:border-border"
  }`;
}

function Frame({ id, label, hideLabel, error, className, children }: FrameProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1.5 block text-label-sm"}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex gap-1.5 text-p-sm text-red-700">
          <Icon name="info-triangle" className="mt-1 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error: string | null | undefined) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
}

export function Field({
  label,
  hideLabel,
  error,
  className,
  ...props
}: FrameProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hideLabel={hideLabel} error={error} className={className}>
      <input {...describedBy(id, error)} {...props} className={`h-12 px-4 ${controlClass(error)}`} />
    </Frame>
  );
}

// Grows with its text up to a limit, then scrolls.
export function TextareaField({
  label,
  hideLabel,
  error,
  className,
  ...props
}: FrameProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hideLabel={hideLabel} error={error} className={className}>
      <textarea
        rows={3}
        {...describedBy(id, error)}
        {...props}
        className={`field-sizing-content max-h-60 min-h-24 resize-none px-4 py-3 ${controlClass(error)}`}
      />
    </Frame>
  );
}

// The browser's own <select>, so phones open their native picker.
export function SelectField({
  label,
  hideLabel,
  error,
  className,
  children,
  ...props
}: FrameProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hideLabel={hideLabel} error={error} className={className}>
      <div className="relative">
        <select
          {...describedBy(id, error)}
          {...props}
          className={`select-field h-12 cursor-pointer pr-11 pl-4 ${controlClass(error)}`}
        >
          {children}
        </select>
        <Icon
          name="arrow-down-1"
          className="pointer-events-none absolute top-1/2 right-4 size-3 -translate-y-1/2 text-muted"
        />
      </div>
    </Frame>
  );
}

type Problem = "valueMissing" | "typeMismatch" | "patternMismatch";

// The first problem the browser's own check finds with an input, in the
// page's words, in the order the messages are given. Null when it's valid.
export function validityMessage(input: HTMLInputElement, messages: Partial<Record<Problem, string>>) {
  const problem = (Object.keys(messages) as Problem[]).find((key) => input.validity[key]);
  return problem ? (messages[problem] ?? null) : null;
}
