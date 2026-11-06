"use client";

import { useEffect, useId, useRef, type InputHTMLAttributes } from "react";
import { Icon } from "./icon";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

interface CheckboxProps extends Props {
  // Some, not all, of a list is checked, like "select all" over part of it.
  indeterminate?: boolean;
  error?: string | null;
}

// Native checkboxes drawn over, so forms, keyboards and screen readers treat
// them as they would any other.
export function Checkbox({ label, description, indeterminate = false, error, className, ...props }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  const errorId = useId();

  // Only a property, with no attribute React could set.
  useEffect(() => {
    ref.current!.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className={className}>
      <label className="group flex cursor-pointer gap-3 has-disabled:cursor-not-allowed">
        <span className="relative mt-0.5 flex size-5 shrink-0">
          <input
            ref={ref}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            {...props}
            className={`peer size-5 cursor-pointer appearance-none rounded-md border bg-surface transition not-disabled:group-hover:border-ink checked:border-ink checked:bg-ink indeterminate:border-ink indeterminate:bg-ink disabled:cursor-not-allowed disabled:border-border-strong/60 disabled:bg-canvas disabled:checked:border-muted disabled:checked:bg-muted ${
              error ? "border-danger" : "border-border-strong"
            }`}
          />
          <Icon
            name="check"
            className="pointer-events-none absolute inset-1 size-3 text-surface opacity-0 transition peer-checked:opacity-100 peer-indeterminate:opacity-0"
          />
          <Icon
            name="minus"
            className="pointer-events-none absolute inset-1 size-3 text-surface opacity-0 transition peer-indeterminate:opacity-100"
          />
        </span>
        <Text label={label} description={description} />
      </label>
      {error && (
        <p id={errorId} className="mt-1.5 ml-8 flex gap-1.5 text-p-sm text-danger">
          <Icon name="info-triangle" className="mt-1 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// For a setting that applies at once, the label first and the switch at the
// end of the row.
export function Switch({ label, description, className, ...props }: Props) {
  return (
    <label
      className={`group flex cursor-pointer items-start justify-between gap-4 has-disabled:cursor-not-allowed ${className ?? ""}`}
    >
      <Text label={label} description={description} />
      <span className="relative mt-0.5 flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          {...props}
          className="peer h-6 w-10 cursor-pointer appearance-none rounded-full bg-border-strong transition not-disabled:not-checked:group-hover:bg-muted not-disabled:checked:group-hover:bg-ink/80 checked:bg-ink disabled:cursor-not-allowed disabled:bg-border disabled:checked:bg-muted"
        />
        <span className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-surface transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

function Text({ label, description }: { label: string; description?: string }) {
  return (
    <span className="min-w-0 group-has-disabled:opacity-60">
      <span className="block text-label-sm">{label}</span>
      {description && <span className="block text-p-xs text-muted">{description}</span>}
    </span>
  );
}
