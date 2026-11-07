import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Icon } from "./icon";
import { Tooltip } from "./tooltip";

interface FrameProps {
  label: string;
  // For a form whose heading already says what the field is for.
  hideLabel?: boolean;
  // What the value is for, behind an info button beside the label.
  hint?: string;
  error?: string | null;
  className?: string;
}

// maxLength otherwise only stops the typing, without saying why.
export function characterCount(value: unknown, maxLength: number | undefined) {
  if (typeof value !== "string" || !maxLength) return null;
  return `${value.length}/${maxLength}`;
}

// ADR 0049 and 0053: 48px controls with their own error under them. Forms set
// noValidate and show their errors here, not in the browser's bubbles, which
// follow the browser's language rather than the page's and can't be styled.
export function controlClass(error: string | null | undefined) {
  return `w-full rounded-xl border bg-surface text-label-md text-ink transition placeholder:text-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted ${
    error
      ? "border-danger focus:ring-3 focus:ring-danger/15"
      : "border-input hover:border-muted focus:border-ink focus:ring-3 focus:ring-ink/10 disabled:hover:border-input"
  }`;
}

// The label, hint and error around a control. Exported for a control drawn
// by a library, like the phone number's, so it reads as one of these. The
// character count shows at the end of the label's row while the control has
// focus, where it takes no room of its own, and the hint behind a question
// mark inside the control (ADR 0067 and 0068).
export function FieldFrame({
  id,
  label,
  hideLabel,
  hint,
  error,
  className,
  count,
  children,
}: FrameProps & { id: string; count?: string | null; children: ReactNode }) {
  return (
    <div className={`group/field ${className ?? ""}`}>
      <div className={hideLabel ? "sr-only" : "mb-1.5 flex items-center gap-1"}>
        <label htmlFor={id} className="text-label-sm">
          {label}
        </label>
        {count && (
          <span className="invisible ml-auto text-p-xs text-muted tabular-nums group-focus-within/field:visible">
            {count}
          </span>
        )}
      </div>
      <div className="relative">
        {children}
        {hint && (
          // The hint is the button's name and the control's description, so
          // a screen reader says it with either. Inside the control, at the
          // end of its first line, the control leaving room for it.
          <button
            type="button"
            className="group absolute top-0.5 right-0.5 flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-ink focus-visible:text-ink"
          >
            <span
              aria-hidden="true"
              className="flex size-4.5 items-center justify-center rounded-full border-[1.5px] border-current text-label-xs leading-none font-semibold"
            >
              ?
            </span>
            <Tooltip wide>{hint}</Tooltip>
            <span id={`${id}-hint`} hidden>
              {hint}
            </span>
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex gap-1.5 text-p-sm text-danger">
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
    <FieldFrame
      id={id}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      className={className}
      count={characterCount(props.value, props.maxLength)}
    >
      <input
        {...describedBy(id, hint, error)}
        {...props}
        className={`h-12 pl-4 ${hint ? "pr-12" : "pr-4"} ${controlClass(error)}`}
      />
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
    <FieldFrame
      id={id}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      className={className}
      count={characterCount(props.value, props.maxLength)}
    >
      <textarea
        rows={3}
        {...describedBy(id, hint, error)}
        {...props}
        className={`field-sizing-content max-h-60 min-h-24 resize-none py-3 pl-4 ${hint ? "pr-12" : "pr-4"} ${controlClass(error)}`}
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
