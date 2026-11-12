import type { ReactNode } from "react";

// Ledger's main call to action: the lime fill slides in from the arrow.
export function ChipButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="btn btn--dark btn--chip" href={href}>
      <span className="btn__label">{children}</span>
      <span className="btn__chip" aria-hidden="true">
        <img src="/home/icon-arrow-right.svg" alt="" width="24" height="24" />
      </span>
    </a>
  );
}
