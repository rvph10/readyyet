import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { getMe } from "@/lib/me";

// The page for choosing a Location, above any single one.
export default async function OverviewLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  return (
    <div className="flex min-h-dvh flex-col p-4 md:p-5">
      <AppHeader me={me} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 py-8">{children}</main>
    </div>
  );
}
