import { describe, expect, it } from "vitest";
import { feedbackHref, parseView } from "../src/app/(dashboard)/locations/[locationId]/feedback/feedback-views";

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
