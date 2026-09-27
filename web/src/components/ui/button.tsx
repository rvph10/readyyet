import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "link";
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

const variants: Record<Exclude<Variant, "link">, string> = {
  primary: "bg-ink text-surface hover:bg-ink/90",
  secondary: "border border-border bg-surface text-muted hover:border-border-strong hover:text-ink",
};

// For a <Link> or <a> that has to look like a button.
export function buttonClass({ variant = "primary", size = "md" }: Options = {}) {
  if (variant === "link") {
    return "text-label-sm text-brand-text transition-colors hover:text-ink disabled:pointer-events-none disabled:text-muted";
  }
  return `inline-flex items-center justify-center gap-2 text-label-sm transition-colors disabled:pointer-events-none disabled:opacity-60 ${variants[variant]} ${sizes[size]}`;
}

interface Props extends Options, ButtonHTMLAttributes<HTMLButtonElement> {}

// className is for placing the button in its layout, not restyling it.
export function Button({ variant, size, className, ...props }: Props) {
  return <button type="button" {...props} className={`${buttonClass({ variant, size })} ${className ?? ""}`} />;
}
