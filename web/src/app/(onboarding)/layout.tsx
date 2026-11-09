import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { getOptionalMe } from "@/lib/me";
import { redirectToSignIn } from "@/lib/next-path";

// Pages on the way into a Business, one thing to do each, centred on the
// canvas without the dashboard around it. They may be opened signed out,
// like an invitation's (ADR 0051).
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const me = await getOptionalMe();
  // The sign-in page asks for it (ADR 0046).
  if (me && !me.name) {
    await redirectToSignIn();
  }
  return (
    <div className="flex min-h-dvh flex-col p-4 md:p-5">
      <AppHeader me={me} />
      <main className="flex flex-1 items-center justify-center py-10">{children}</main>
    </div>
  );
}
