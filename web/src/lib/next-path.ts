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
