import { getSessionCookie } from "better-auth/cookies";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { pageData } from "@/lib/api/errors";
import { safeNextPath } from "@/lib/next-path";
import { SignInForm } from "./sign-in-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signIn");
  return { title: t("title") };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined);

  // The page checks the session itself, not the proxy: a User who signed in
  // but never gave their name comes back here for it (ADR 0046).
  const requestHeaders = await headers();
  let needsName = false;
  if (getSessionCookie(requestHeaders)) {
    const result = await (await api()).GET("/me");
    // A cookie whose session has ended is a visitor like any other.
    if (result.response.status !== 401) {
      const me = pageData(result);
      if (me.name) {
        redirect(nextPath);
      }
      needsName = true;
    }
  }

  // Set by the proxy, for the <style> the code field adds.
  const nonce = requestHeaders.get("x-nonce") as string;
  return <SignInForm next={nextPath} needsName={needsName} nonce={nonce} />;
}
