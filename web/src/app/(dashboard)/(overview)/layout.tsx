import type { ReactNode } from "react";
import { AppHeader, SignedInUser } from "@/components/app-header";
import { PickerBar } from "@/components/top-bar";
import { getMe } from "@/lib/me";

// The page for choosing a Location, above any single one. A phone has no top
// bar (ADR 0103), so it keeps the header.
export default async function OverviewLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  return (
    <div className="flex min-h-dvh flex-col">
      <PickerBar memberships={me.memberships}>
        <SignedInUser me={me} />
      </PickerBar>
      <div className="px-4 pt-4 md:hidden">
        <AppHeader me={me} />
      </div>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 md:px-5">{children}</main>
    </div>
  );
}
