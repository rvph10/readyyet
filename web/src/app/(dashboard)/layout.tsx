import type { ReactNode } from "react";
import { getMe } from "@/lib/me";
import { redirectToSignIn } from "@/lib/next-path";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  // The sign-in page asks for it (ADR 0046).
  if (!me.name) {
    await redirectToSignIn();
  }
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <span className="font-semibold">ReadyYet</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">{me.name}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-col gap-6">{children}</main>
    </div>
  );
}
