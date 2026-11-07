import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "brand" | "danger" | "danger-secondary" | "link";
type Size = "sm" | "md" | "lg" | "icon";

interface Options {
  variant?: Variant;
  size?: Size;
}

// ADR 0087: a 48px pill, a 40px one inside rows and cards (44px for touch), a
// full-width block for a form's main action, or a 48px circle around an icon.
// A link-styled button sits inline in text, sizeless.
const sizes: Record<Size, string> = {
  sm: "h-11 rounded-full px-4 text-label-sm lg:h-10",
  md: "h-12 rounded-full px-5 text-label-sm",
  lg: "h-12 w-full rounded-full px-5 text-label-sm",
  icon: "size-12 shrink-0 rounded-full text-label-sm",
};

// not-disabled: a disabled button keeps its look under the pointer, which
// shows it can't be clicked (ADR 0056).
const variants: Record<Exclude<Variant, "link">, string> = {
  primary: "bg-pine text-surface not-disabled:hover:bg-pine-hover",
  secondary: "border border-border-strong bg-surface text-ink not-disabled:hover:bg-subtle",
  // Only for moving a Ticket to READY (ADR 0042).
  brand: "bg-brand text-ink not-disabled:hover:bg-brand-hover not-disabled:active:brightness-95",
  // Only for the action that confirms something can't be undone.
  danger: "bg-danger text-surface not-disabled:hover:bg-danger-hover not-disabled:active:bg-danger-active",
  // ADR 0064: a destructive action that's offered, not the one confirming
  // it, like Decline or Sign out, quieter than the red fill.
  "danger-secondary": "border border-border-strong bg-surface text-danger not-disabled:hover:bg-danger-subtle",
};

// For a <Link> or <a> that has to look like a button.
export function buttonClass({ variant = "primary", size = "md" }: Options = {}) {
  if (variant === "link") {
    return "cursor-pointer text-label-sm text-brand-text underline-offset-4 transition-colors not-disabled:hover:text-ink not-disabled:hover:underline disabled:cursor-not-allowed disabled:text-muted";
  }
  return `inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap transition not-disabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-70 ${variants[variant]} ${sizes[size]}`;
}

interface Props extends Options, ButtonHTMLAttributes<HTMLButtonElement> {
  // While its action runs: no second click, the pointer says it's busy, and
  // pendingLabel ("Saving…") replaces the label, for touch screens where
  // there's no pointer to see (ADR 0057).
  pending?: boolean;
  pendingLabel?: string;
}

// className is for placing the button in its layout, not restyling it.
export function Button({ variant, size, pending, pendingLabel, disabled, className, children, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${buttonClass({ variant, size })} ${className ?? ""}`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
