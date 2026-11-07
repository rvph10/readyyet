export type ReviewLinkResult = "works" | "dead" | "unknown";

const MOST_HOPS = 6;
const TIMEOUT_MS = 5000;
// What Google answers a plain client with differs from what it gives a browser.
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
// Each redirect is checked before it's followed, so a saved link can only lead
// this server to hosts shaped like Google's. A pattern rather than a list, as
// Google redirects to any of its country domains, so some it doesn't own pass:
// only a redirect from Google could reach one, and all that's learned is the result.
const GOOGLE_HOST = /^(?:[a-z0-9-]+\.)*(?:google\.(?:com|[a-z]{2}|com?\.[a-z]{2})|g\.page|goo\.gl)$/;

// ADR 0109: a link Google no longer knows ends on its home page or a 404, so
// following it tells a typo from a working link. It can't tell whose review page
// it is: Google asks to sign in first.
export async function checkReviewLink(link: string): Promise<ReviewLinkResult> {
  let url = new URL(link);
  try {
    for (let hop = 0; hop < MOST_HOPS; hop++) {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": BROWSER },
      });
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) {
        return response.ok ? "works" : response.status >= 500 ? "unknown" : "dead";
      }
      url = new URL(location, url);
      if (url.protocol !== "https:" || !GOOGLE_HOST.test(url.hostname)) return "dead";
      if (url.pathname === "/" && url.hostname !== "g.page") return "dead";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}
