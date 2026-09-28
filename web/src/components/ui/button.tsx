import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "brand" | "danger" | "link";
type Size = "md" | "lg" | "icon";

interface Options {
  variant?: Variant;
  size?: Size;
}

// ADR 0049: a 44px pill, a 48px full-width block that reads as one with the
// inputs of a form, or a 44px circle around an icon. A link-styled button
// sits inline in text, sizeless.
const sizes: Record<Size, string> = {
  md: "h-11 rounded-full px-5",
  lg: "h-12 w-full rounded-xl px-5",
  icon: "size-11 shrink-0 rounded-full",
};

// not-disabled: a disabled button keeps its look under the pointer, which
// shows it can't be clicked (ADR 0056).
const variants: Record<Exclude<Variant, "link">, string> = {
  primary: "bg-ink text-surface not-disabled:hover:bg-ink/80 not-disabled:active:bg-ink/70",
  secondary:
    "border border-border bg-surface text-muted not-disabled:hover:border-border-strong not-disabled:hover:bg-canvas not-disabled:hover:text-ink not-disabled:active:bg-border",
  // Only for moving a Ticket to READY (ADR 0042).
  brand: "bg-brand text-ink not-disabled:hover:bg-brand-hover not-disabled:active:brightness-95",
  // Only for the action that confirms something can't be undone.
  danger: "bg-red-700 text-surface not-disabled:hover:bg-red-800 not-disabled:active:bg-red-900",
};

// For a <Link> or <a> that has to look like a button.
export function buttonClass({ variant = "primary", size = "md" }: Options = {}) {
  if (variant === "link") {
    return "cursor-pointer text-label-sm text-brand-text underline-offset-4 transition-colors not-disabled:hover:text-ink not-disabled:hover:underline disabled:cursor-not-allowed disabled:text-muted";
  }
  return `inline-flex cursor-pointer items-center justify-center gap-2 text-label-sm transition disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-70 ${variants[variant]} ${sizes[size]}`;
}

interface Props extends Options, ButtonHTMLAttributes<HTMLButtonElement> {
  // While its action runs: no second click, and the pointer says it's busy.
  pending?: boolean;
}

// className is for placing the button in its layout, not restyling it.
export function Button({ variant, size, pending, disabled, className, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${buttonClass({ variant, size })} ${className ?? ""}`}
    />
  );
}
