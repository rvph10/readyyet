import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { getMe } from "@/lib/me";
import { redirectToSignIn } from "@/lib/next-path";
import logo from "../icon.svg";

// Next.js types *.svg imports as any, see (sign-in)/layout.tsx.
const logoImage = logo as StaticImageData;

// Pages a signed-in User passes through on the way into a Business, one
// thing to do each, centred on the canvas without the dashboard around it.
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  // The sign-in page asks for it (ADR 0046).
  if (!me.name) {
    await redirectToSignIn();
  }
  return (
    <div className="flex min-h-dvh flex-col p-4 md:p-5">
      <header className="flex items-center justify-between gap-4">
        {/* Decorative, every page here names ReadyYet in its text. */}
        <Image src={logoImage} alt="" priority className="size-10" />
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-label-sm">{me.name}</p>
            <p className="text-p-xs text-muted">{me.email}</p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center py-10">{children}</main>
    </div>
  );
}
