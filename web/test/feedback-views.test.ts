import { describe, expect, it } from "vitest";
import {
  feedbackBlock,
  feedbackHref,
  parseView,
} from "../src/app/(dashboard)/locations/[locationId]/feedback/feedback-views";

describe("feedbackBlock", () => {
  const link = { googleReviewUrl: "https://g.page/r/shop" };
  const noLink = { googleReviewUrl: null };

  it("follows the API's asksForFeedback", () => {
    expect(feedbackBlock(link, { plan: "PRO", frozen: false })).toBeNull();
    expect(feedbackBlock(noLink, { plan: "PRO", frozen: false })).toBe("reviewLink");
    expect(feedbackBlock(link, { plan: "ESSENTIEL", frozen: false })).toBe("plan");
    expect(feedbackBlock(link, { plan: "PRO", frozen: true })).toBe("plan");
    expect(feedbackBlock(link, { plan: null, frozen: false })).toBe("plan");
  });

  it("asks for the plan first, a link alone wouldn't turn it on", () => {
    expect(feedbackBlock(noLink, { plan: "ESSENTIEL", frozen: false })).toBe("plan");
  });
});

describe("parseView", () => {
  it("opens on what's waiting unless the URL says otherwise", () => {
    expect(parseView(undefined)).toBe("waiting");
    expect(parseView("nonsense")).toBe("waiting");
    expect(parseView(["handled"])).toBe("waiting");
    expect(parseView("handled")).toBe("handled");
  });
});

describe("feedbackHref", () => {
  it("leaves the defaults out of the URL", () => {
    expect(feedbackHref("loc", { view: "waiting" })).toBe("/locations/loc/feedback");
    expect(feedbackHref("loc", { view: "handled", page: 12 })).toBe("/locations/loc/feedback?view=handled&page=12");
  });
});
