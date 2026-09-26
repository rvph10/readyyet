import type { ReactNode } from "react";

// The body of error.tsx, global-error.tsx and not-found.tsx, which differ
// in where their text comes from, not in how they look.
export function ErrorMessage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 px-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}
