import type { StaticImageData } from "next/image";
import logo from "@/app/icon.svg";
import { SignOutButton } from "./sign-out-button";

// Next.js types *.svg imports as any, see (sign-in)/layout.tsx.
const logoImage = logo as StaticImageData;

// The logo, and who's signed in with a way out, over the dashboard and the
// onboarding pages. Without a User, as on an invitation opened signed out,
// only the logo.
export function AppHeader({ me }: { me: { name: string | null; email: string } | null }) {
  return (
    <header className="flex h-11 items-center justify-between gap-4">
      {/* Decorative, every page under it names ReadyYet or its Business. A
          vector, so next/image has nothing to add, and its style attribute is
          refused by the Content-Security-Policy. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoImage.src} alt="" width={40} height={40} className="size-10" />
      {me && (
        <div className="flex items-center gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="text-label-sm">{me.name}</p>
            <p className="text-p-xs text-muted">{me.email}</p>
          </div>
          <SignOutButton />
        </div>
      )}
    </header>
  );
}
