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
  // A line under the control on what the value is for.
  hint?: string;
  error?: string | null;
  className?: string;
}

// ADR 0049 and 0053: 48px controls with their own error under them. Forms set
// noValidate and show their errors here, not in the browser's bubbles, which
// follow the browser's language rather than the page's and can't be styled.
function controlClass(error: string | null | undefined) {
  return `w-full rounded-xl border bg-surface text-label-md text-ink transition placeholder:text-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted ${
    error
      ? "border-red-700 focus:ring-3 focus:ring-red-700/15"
      : "border-border hover:border-border-strong focus:border-ink focus:ring-3 focus:ring-ink/10 disabled:hover:border-border"
  }`;
}

// The label, hint and error around a control. Exported for a control drawn
// by a library, like the phone number's, so it reads as one of these.
export function FieldFrame({
  id,
  label,
  hideLabel,
  hint,
  error,
  className,
  children,
}: FrameProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1.5 block text-label-sm"}>
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-p-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex gap-1.5 text-p-sm text-red-700">
          <Icon name="info-triangle" className="mt-1 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, hint: string | undefined, error: string | null | undefined) {
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": described || undefined,
  };
}

export function Field({
  label,
  hideLabel,
  hint,
  error,
  className,
  ...props
}: FrameProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} hideLabel={hideLabel} hint={hint} error={error} className={className}>
      <input {...describedBy(id, hint, error)} {...props} className={`h-12 px-4 ${controlClass(error)}`} />
    </FieldFrame>
  );
}

// Grows with its text up to a limit, then scrolls.
export function TextareaField({
  label,
  hideLabel,
  hint,
  error,
  className,
  ...props
}: FrameProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} hideLabel={hideLabel} hint={hint} error={error} className={className}>
      <textarea
        rows={3}
        {...describedBy(id, hint, error)}
        {...props}
        className={`field-sizing-content max-h-60 min-h-24 resize-none px-4 py-3 ${controlClass(error)}`}
      />
    </FieldFrame>
  );
}

// The browser's own <select>, so phones open their native picker.
export function SelectField({
  label,
  hideLabel,
  hint,
  error,
  className,
  children,
  ...props
}: FrameProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} hideLabel={hideLabel} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          {...describedBy(id, hint, error)}
          {...props}
          // An empty value is the "Choose one" prompt, muted like a placeholder.
          className={`select-field peer h-12 cursor-pointer pr-11 pl-4 has-[option[value='']:checked]:text-muted ${controlClass(error)}`}
        >
          {children}
        </select>
        <Icon
          name="arrow-down-1"
          className="pointer-events-none absolute top-1/2 right-4 size-3 -translate-y-1/2 text-muted transition-transform peer-open:rotate-180"
        />
      </div>
    </FieldFrame>
  );
}

type Problem = "valueMissing" | "typeMismatch" | "patternMismatch";

// The first problem the browser's own check finds with an input, in the
// page's words, in the order the messages are given. Null when it's valid.
export function validityMessage(input: HTMLInputElement, messages: Partial<Record<Problem, string>>) {
  const problem = (Object.keys(messages) as Problem[]).find((key) => input.validity[key]);
  return problem ? (messages[problem] ?? null) : null;
}
