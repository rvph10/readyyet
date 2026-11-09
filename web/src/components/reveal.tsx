import { Suspense, ViewTransition, useId, type ReactNode } from "react";

// ADR 0122: a Suspense whose placeholder crossfades into what it was waiting
// for. Both share one name, so the browser fades them as one picture and what
// they have in common, a tile's frame, stays still. default="none" keeps it
// out of every other transition, like a refresh or a form saving inside.
export function Reveal({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const name = `reveal-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <Suspense
      fallback={
        <ViewTransition name={name} share="arrive" default="none">
          {fallback}
        </ViewTransition>
      }
    >
      <ViewTransition name={name} share="arrive" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  );
}
