import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { getMe } from "@/lib/me";
import { redirectToSignIn } from "@/lib/next-path";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  // The sign-in page asks for it (ADR 0046).
  if (!me.name) {
    await redirectToSignIn();
  }
  return (
    <div className="flex min-h-dvh flex-col p-4 md:p-5">
      <AppHeader me={me} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">{children}</main>
    </div>
  );
}
