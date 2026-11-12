import type { ReactNode } from "react";

// The label is written twice: the overlay's copy sits on the dark fill that
// grows from the pointer (fill-buttons.ts), so the text changes colour
// exactly where the fill has reached.
export function FillButton({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return (
    <a className={`btn btn--fill ${className}`} href={href}>
      <span className="btn__label">{children}</span>
      <span className="btn__overlay" aria-hidden="true">
        <span className="btn__label">{children}</span>
      </span>
    </a>
  );
}
