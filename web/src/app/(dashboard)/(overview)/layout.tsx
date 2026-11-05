import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { getMe } from "@/lib/me";

// The pages above a single Location: choosing one, and a Business's own.
export default async function OverviewLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  return (
    <div className="flex min-h-dvh flex-col p-4 md:p-5">
      <AppHeader me={me} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">{children}</main>
    </div>
  );
}
