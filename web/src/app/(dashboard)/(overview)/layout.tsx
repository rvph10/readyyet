import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { PickerFrame } from "@/components/top-bar";
import { getMe } from "@/lib/me";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

// The page for choosing a Location, above any single one. A phone has no top
// bar (ADR 0103), so it keeps the header.
export default async function OverviewLayout({ children }: { children: ReactNode }) {
  const [me, cookieStore] = await Promise.all([getMe(), cookies()]);
  return (
    <div className="flex min-h-dvh flex-col">
      <PickerFrame
        me={me}
        memberships={me.memberships}
        collapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-4 pt-4 md:hidden">
            <AppHeader me={me} />
          </div>
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 md:px-5">{children}</main>
        </div>
      </PickerFrame>
    </div>
  );
}
