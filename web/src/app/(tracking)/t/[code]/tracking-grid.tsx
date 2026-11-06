import type { ReactNode } from "react";

// Shared by the page and its skeleton, so nothing moves when the page loads.
export function TrackingGrid({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <main aria-busy={busy} className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-4 p-4 md:p-5 lg:gap-5">
      {children}
    </main>
  );
}

// ADR 0095: the Status over the progress, the Location down the side. The last
// row takes what the screen has left. A phone has one column, in the order of
// each tile's order-* class, since what comes first differs by Status.
export function TrackingBento({ photos, children }: { photos: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-5 ${
        photos ? "lg:grid-rows-[auto_auto_1fr]" : "lg:grid-rows-[auto_1fr]"
      }`}
    >
      {children}
    </div>
  );
}
