import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "./illustration";
import { Panel } from "./ui/panel";

// The body of error.tsx, global-error.tsx and not-found.tsx, which differ
// in where their text comes from, not in how they look.
export function ErrorMessage({
  title,
  illustration,
  children,
}: {
  title: string;
  illustration: IllustrationName;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Panel padding="lg" className="flex w-full max-w-md flex-col gap-3 md:p-8">
        <Illustration name={illustration} className="mb-2 h-44 w-auto self-center" />
        <h1 className="text-title-h4">{title}</h1>
        {children}
      </Panel>
    </main>
  );
}
