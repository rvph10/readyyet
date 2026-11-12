// Set by the app on the parent domain while a session exists (ADR 0144,
// web/src/lib/consent.ts). It only changes a link, nothing trusts it.
export const SIGNED_IN_COOKIE = "signed-in";

export function isSignedIn(cookies: string) {
  return cookies.split("; ").some((cookie) => cookie === `${SIGNED_IN_COOKIE}=1`);
}
