import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ORIGIN = "http://web.invalid";

// Where to go after signing in: only ever a path on the web app itself, so a
// crafted link can't send someone to another site (ADR 0045).
export function safeNextPath(next: string | null | undefined): string {
  if (!next?.startsWith("/")) {
    return "/";
  }
  const url = new URL(next, ORIGIN);
  return url.origin === ORIGIN ? `${url.pathname}${url.search}` : "/";
}

// Back to the page asked for once signed in, such as an Invitation opened
// after the session ended. The proxy sets x-path.
export async function redirectToSignIn(): Promise<never> {
  const path = (await headers()).get("x-path");
  redirect(path && path !== "/" ? `/sign-in?${new URLSearchParams({ next: path })}` : "/sign-in");
}
