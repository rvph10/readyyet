import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOptionalMe } from "@/lib/me";
import { safeNextPath } from "@/lib/next-path";
import { referralCode, withReferral } from "@/lib/referral";
import { SignInForm } from "./sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signIn");
  return { title: t("pageTitle") };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, sentTo, ref, error } = await searchParams;
  // A referral link (/sign-in?ref=) carries its code on to the Business the
  // User creates next (ADR 0135).
  const nextPath = typeof next === "string" ? safeNextPath(next) : withReferral("/", referralCode(ref));

  // The page checks the session itself, not the proxy: a User who signed in
  // but never gave their name comes back here for it (ADR 0046).
  const me = await getOptionalMe();
  if (me?.name) {
    redirect(nextPath);
  }

  // Set by the proxy, for the <style> the code field adds.
  const nonce = (await headers()).get("x-nonce") as string;
  return (
    <SignInForm
      next={nextPath}
      needsName={me !== null}
      // An invitation page already sent the code to this address (ADR 0051).
      sentTo={typeof sentTo === "string" ? sentTo : undefined}
      googleError={typeof error === "string" ? error : undefined}
      nonce={nonce}
    />
  );
}
