import { useId } from "react";
import { Icon, type IconName } from "./icon";

export interface RadioCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: IconName;
}

// The choice none of the others fits, whose card takes the owner's own
// words once chosen.
interface OtherOption {
  value: string;
  label: string;
  // The text field's name, said by screen readers and shown while empty.
  placeholder: string;
  text: string;
  onTextChange: (text: string) => void;
  maxLength: number;
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
  // Always last, the card that becomes a text field when chosen.
  other?: OtherOption;
  className?: string;
}

// A wrapping row rather than a grid, so a chosen Other can grow from its
// column to the whole row with a transition, which a grid's spans can't.
const widths = {
  1: "w-full",
  2: "w-full sm:w-[calc((100%-0.5rem)/2)]",
  3: "w-full sm:w-[calc((100%-1rem)/3)]",
};

const cardClass = (error: string | null | undefined) =>
  `flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-3.5 transition-all duration-300 has-checked:border-ink has-checked:ring-3 has-checked:ring-ink/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink has-disabled:cursor-not-allowed has-disabled:border-border has-disabled:bg-subtle has-disabled:text-muted has-disabled:ring-0 ${
    error ? "border-danger" : "border-border hover:border-border-strong"
  }`;

function Check() {
  return (
    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-surface transition peer-checked:border-ink peer-checked:bg-ink peer-disabled:peer-checked:border-muted peer-disabled:peer-checked:bg-muted">
      <Icon name="check" className="size-2.5" />
    </span>
  );
}

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
  other,
  className,
}: Props) {
  const errorId = useId();
  const otherChosen = other !== undefined && value === other.value;

  const radio = (optionValue: string) => (
    <input
      type="radio"
      name={name}
      value={optionValue}
      defaultChecked={defaultValue === undefined ? undefined : optionValue === defaultValue}
      checked={value === undefined ? undefined : optionValue === value}
      onChange={onChange && (() => onChange(optionValue))}
      required={required}
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      className="peer sr-only"
    />
  );

  return (
    <fieldset aria-describedby={error ? errorId : undefined} className={className}>
      <legend className="mb-1.5 text-label-sm">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className={`${widths[columns]} ${cardClass(error)}`}>
            {radio(option.value)}
            {option.icon && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-ink">
                <Icon name={option.icon} className="size-4" />
              </span>
            )}
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="block text-label-sm font-semibold">{option.label}</span>
              {option.description && <span className="mt-1 block text-p-xs text-muted">{option.description}</span>}
            </span>
            <Check />
          </label>
        ))}
        {other && (
          // Chosen, it widens to the whole row and its label gives way to a
          // text field, focused once it's there.
          <label className={`${otherChosen ? "w-full" : widths[columns]} ${cardClass(error)}`}>
            {radio(other.value)}
            <span className="min-w-0 flex-1 pt-0.5">
              {otherChosen ? (
                <input
                  // It only appears once Other is chosen, to be typed in.
                  autoFocus
                  aria-label={other.placeholder}
                  placeholder={other.placeholder}
                  maxLength={other.maxLength}
                  value={other.text}
                  onChange={(event) => other.onTextChange(event.target.value)}
                  className="-my-0.5 block w-full bg-transparent text-label-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
                />
              ) : (
                <span className="block text-label-sm font-semibold">{other.label}</span>
              )}
            </span>
            <Check />
          </label>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 flex gap-1.5 text-p-sm text-danger">
          <Icon name="info-triangle" className="mt-1 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
