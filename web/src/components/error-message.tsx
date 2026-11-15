import type { ReactNode } from "react";
import { Illustration, type IllustrationName } from "./illustration";
import { Panel } from "./ui/panel";

// The body of error.tsx, global-error.tsx and not-found.tsx, which differ
// in where their text comes from, not in how they look. In a dashboard
// layout it fills the layout's own <main>, its navigation staying around it.
export function ErrorMessage({
  title,
  illustration,
  inLayout = false,
  children,
}: {
  title: string;
  illustration: IllustrationName;
  inLayout?: boolean;
  children: ReactNode;
}) {
  const Frame = inLayout ? "div" : "main";
  return (
    <Frame className={`flex items-center justify-center p-4 ${inLayout ? "flex-1" : "min-h-dvh"}`}>
      <Panel padding="lg" className="flex w-full max-w-md flex-col gap-3 md:p-8">
        <Illustration name={illustration} className="mb-2 h-44 w-auto self-center" />
        <h1 className="text-title-h4">{title}</h1>
        {children}
      </Panel>
    </Frame>
  );
}
