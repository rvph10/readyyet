import type { ReactNode } from "react";

// Shared by the page and its skeleton, so nothing moves when the page loads.
export function TrackingGrid({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <main aria-busy={busy} className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 p-4 md:p-5 lg:gap-5">
      {children}
    </main>
  );
}

// Two equal columns on a large screen, so no panel is wider than its content
// needs. A phone has one column, in the order of each panel's order-* class:
// the columns dissolve there, since what comes first differs by Status.
export function TrackingColumns({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-5">{children}</div>;
}

export function TrackingColumn({ children }: { children: ReactNode }) {
  return <div className="contents lg:flex lg:flex-col lg:gap-5">{children}</div>;
}
