import type { ReactNode } from "react";
import { getMe } from "@/lib/me";
import { redirectToSignIn } from "@/lib/next-path";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  // The sign-in page asks for it (ADR 0046).
  if (!me.name) {
    await redirectToSignIn();
  }
  return children;
}
