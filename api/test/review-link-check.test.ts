import { afterEach, describe, expect, it, vi } from "vitest";
import { checkReviewLink } from "../src/location/review-link-check";

const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });
const answers = (...responses: unknown[]) => {
  const fetch = vi.fn();
  for (const response of responses) {
    if (response instanceof Error) fetch.mockRejectedValueOnce(response);
    else fetch.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

describe("checkReviewLink", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls a link that reaches a Google page a working one", async () => {
    answers(redirect("https://search.google.com/local/writereview?placeid=x"), new Response("ok"));
    await expect(checkReviewLink("https://g.page/r/abc/review")).resolves.toBe("works");
  });

  it("calls a link Google sends to its home page dead", async () => {
    const fetch = answers(redirect("https://g.page/r/abc/review/"), redirect("https://www.google.com"));
    await expect(checkReviewLink("https://g.page/r/abc/review")).resolves.toBe("dead");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("calls a link Google doesn't know dead", async () => {
    answers(new Response(null, { status: 404 }));
    await expect(checkReviewLink("https://maps.app.goo.gl/abc")).resolves.toBe("dead");
  });

  it("never follows a redirect away from Google", async () => {
    const fetch = answers(redirect("https://169.254.169.254/latest/meta-data"));
    await expect(checkReviewLink("https://g.page/r/abc/review")).resolves.toBe("dead");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("doesn't take a lookalike host for Google", async () => {
    const fetch = answers(redirect("https://google.com.evil.example/x"));
    await expect(checkReviewLink("https://g.page/r/abc/review")).resolves.toBe("dead");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("says so when Google can't be reached", async () => {
    answers(new Error("timeout"));
    await expect(checkReviewLink("https://g.page/r/abc/review")).resolves.toBe("unknown");
  });
});
