import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOptionalMe } from "@/lib/me";
import { safeNextPath } from "@/lib/next-path";
import { SignInForm } from "./sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signIn");
  return { title: t("pageTitle") };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, sentTo } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined);

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
      nonce={nonce}
    />
  );
}
