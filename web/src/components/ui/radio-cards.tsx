import { useId } from "react";
import { Icon, type IconName } from "./icon";

export interface RadioCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: IconName;
}

interface Props {
  legend: string;
  name: string;
  options: RadioCardOption[];
  // Uncontrolled in a form, or controlled with value and onChange.
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  columns?: 1 | 2 | 3;
  className?: string;
}

const grids = { 1: "grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" };

// ADR 0059: a choice between a few options, like a Business type or a Role,
// each a card. Native radios under the cards, so arrow keys move between
// them and forms submit the value. The chosen card has an ink outline and
// check, never lime, which is only a fill (ADR 0052).
export function RadioCards({
  legend,
  name,
  options,
  defaultValue,
  value,
  onChange,
  required,
  disabled,
  error,
  columns = 2,
  className,
}: Props) {
  const errorId = useId();
  return (
    <fieldset aria-describedby={error ? errorId : undefined} className={className}>
      <legend className="mb-1.5 text-label-sm">{legend}</legend>
      <div className={`grid gap-2 ${grids[columns]}`}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-3.5 transition has-checked:border-ink has-checked:ring-3 has-checked:ring-ink/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink has-disabled:cursor-not-allowed has-disabled:border-border has-disabled:bg-subtle has-disabled:text-muted has-disabled:ring-0 ${
              error ? "border-red-700" : "border-border hover:border-border-strong"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === undefined ? undefined : option.value === defaultValue}
              checked={value === undefined ? undefined : option.value === value}
              onChange={onChange && (() => onChange(option.value))}
              required={required}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              className="peer sr-only"
            />
            {option.icon && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink">
                <Icon name={option.icon} className="size-4" />
              </span>
            )}
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="block text-label-sm">{option.label}</span>
              {option.description && <span className="block text-p-xs text-muted">{option.description}</span>}
            </span>
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-surface transition peer-checked:border-ink peer-checked:bg-ink peer-disabled:peer-checked:border-muted peer-disabled:peer-checked:bg-muted">
              <Icon name="check" className="size-2.5" />
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 flex gap-1.5 text-p-sm text-red-700">
          <Icon name="info-triangle" className="mt-1 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
