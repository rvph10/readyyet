import { useTranslations } from "next-intl";
import Link from "next/link";
import { Logo } from "./logo";
import { SignOutButton } from "./sign-out-button";

function SignedInUser({ me }: { me: { name: string | null; email: string } }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="text-label-sm">{me.name}</p>
        <p className="text-p-xs text-muted">{me.email}</p>
      </div>
      <SignOutButton />
    </div>
  );
}

// The logo, and who's signed in with a way out, over the dashboard and the
// onboarding pages. Without a User, as on an invitation opened signed out,
// only the logo.
export function AppHeader({ me }: { me: { name: string | null; email: string } | null }) {
  const t = useTranslations("common");
  return (
    <header className="flex h-11 items-center justify-between gap-4">
      {me ? (
        <Link href="/" aria-label={t("home")}>
          <Logo className="size-10" />
        </Link>
      ) : (
        <Logo className="size-10" />
      )}
      {me && <SignedInUser me={me} />}
    </header>
  );
}
