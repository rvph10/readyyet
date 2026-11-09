import { describe, expect, it } from "vitest";
import {
  asksForFeedback,
  feedbackHref,
  parseView,
} from "../src/app/(dashboard)/locations/[locationId]/feedback/feedback-views";

describe("asksForFeedback", () => {
  it("follows the API's: Pro and not frozen, Google link or not", () => {
    expect(asksForFeedback({ plan: "PRO", frozen: false })).toBe(true);
    expect(asksForFeedback({ plan: "ESSENTIEL", frozen: false })).toBe(false);
    expect(asksForFeedback({ plan: "PRO", frozen: true })).toBe(false);
    expect(asksForFeedback({ plan: null, frozen: false })).toBe(false);
  });
});

describe("parseView", () => {
  it("opens on what needs a follow-up unless the URL says otherwise", () => {
    expect(parseView(undefined)).toBe("follow-up");
    expect(parseView("nonsense")).toBe("follow-up");
    expect(parseView(["all"])).toBe("follow-up");
    expect(parseView("all")).toBe("all");
  });
});

describe("feedbackHref", () => {
  it("leaves the defaults out of the URL", () => {
    expect(feedbackHref("loc", { view: "follow-up" })).toBe("/locations/loc/feedback");
    expect(feedbackHref("loc", { view: "all", page: 12 })).toBe("/locations/loc/feedback?view=all&page=12");
  });
});
