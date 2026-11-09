import type { ReactNode } from "react";
import { getMe } from "@/lib/me";
import { redirectToSignIn } from "@/lib/next-path";

// Creating a Business, split like the sign-in page between the form and a
// preview of what it sets up (ADR 0072), without the dashboard around it.
export default async function CreateBusinessLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  // The sign-in page asks for it (ADR 0046).
  if (!me.name) {
    await redirectToSignIn();
  }
  return <div className="flex min-h-dvh p-4 md:p-5">{children}</div>;
}
