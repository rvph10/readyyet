"use client";

import { useSyncExternalStore } from "react";
import { isSignedIn } from "@/lib/signed-in";

// The pages are cached for everyone, so who's signed in is read in the
// browser: someone already using ReadyYet goes to their dashboard.
export function AccountLink({
  signIn,
  dashboard,
  signInLabel,
  dashboardLabel,
}: {
  signIn: string;
  dashboard: string;
  signInLabel: string;
  dashboardLabel: string;
}) {
  const signedIn = useSyncExternalStore(
    () => () => undefined,
    () => isSignedIn(document.cookie),
    () => false,
  );
  return (
    <a className="nav__link nav__signin" href={signedIn ? dashboard : signIn}>
      {signedIn ? dashboardLabel : signInLabel}
    </a>
  );
}
