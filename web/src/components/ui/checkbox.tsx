import type { InputHTMLAttributes } from "react";
import { Icon } from "./icon";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

// Native checkboxes drawn over, so forms, keyboards and screen readers treat
// them as they would any other.
export function Checkbox({ label, description, className, ...props }: Props) {
  return (
    <label className={`group flex cursor-pointer gap-3 has-disabled:cursor-not-allowed ${className ?? ""}`}>
      <span className="relative mt-0.5 flex size-5 shrink-0">
        <input
          type="checkbox"
          {...props}
          className="peer size-5 cursor-pointer appearance-none rounded-md border border-border-strong bg-surface transition not-disabled:group-hover:border-ink checked:border-ink checked:bg-ink disabled:cursor-not-allowed disabled:border-border disabled:bg-subtle disabled:checked:border-muted disabled:checked:bg-muted"
        />
        <Icon
          name="check"
          className="pointer-events-none absolute inset-1 size-3 text-surface opacity-0 transition peer-checked:opacity-100"
        />
      </span>
      <Text label={label} description={description} />
    </label>
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
        <span className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-surface shadow-float transition-transform peer-checked:translate-x-4" />
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
