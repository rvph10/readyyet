import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "link";
type Size = "md" | "lg";

interface Options {
  variant?: Variant;
  size?: Size;
}

// ADR 0049: a 44px pill, or a 48px full-width block that reads as one with
// the inputs of a form. A link-styled button sits inline in text, sizeless.
const sizes: Record<Size, string> = {
  md: "h-11 rounded-full px-5",
  lg: "h-12 w-full rounded-xl px-5",
};

// For a <Link> or <a> that has to look like a button.
export function buttonClass({ variant = "primary", size = "md" }: Options = {}) {
  if (variant === "link") {
    return "text-label-sm text-brand-text transition-colors hover:text-ink disabled:pointer-events-none disabled:text-muted";
  }
  return `inline-flex items-center justify-center gap-2 bg-ink text-label-sm text-surface transition-colors hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-60 ${sizes[size]}`;
}

interface Props extends Options, ButtonHTMLAttributes<HTMLButtonElement> {}

// className is for placing the button in its layout, not restyling it.
export function Button({ variant, size, className, ...props }: Props) {
  return <button type="button" {...props} className={`${buttonClass({ variant, size })} ${className ?? ""}`} />;
}
