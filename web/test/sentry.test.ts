import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { redactUrl, sentryOptions } from "../src/lib/sentry";

describe("redactUrl", () => {
  it.each([
    ["/t/ABC123", "/t/[redacted]"],
    ["/t/ABC123/collected?x=1", "/t/[redacted]/collected"],
    [
      "http://api.railway.internal:8080/tracking/ABC123/feedback",
      "http://api.railway.internal:8080/tracking/[redacted]/feedback",
    ],
    ["/locations/l1/tickets?q=Jane", "/locations/l1/tickets"],
  ])("%s becomes %s", (url, expected) => {
    expect(redactUrl(url)).toBe(expected);
  });
});

describe("sentryOptions", () => {
  it("keeps no tracking code, query, cookie or user in an event", () => {
    const event: ErrorEvent = {
      type: undefined,
      request: { method: "GET", url: "https://app.readyyet.app/t/ABC123?q=Jane", cookies: { session: "s" } },
      transaction: "GET /t/ABC123",
      contexts: { nextjs: { request_path: "/t/ABC123?q=Jane" } },
      user: { email: "jane@example.com" },
    };
    const sent = JSON.stringify(sentryOptions.beforeSend!(event, {}));
    expect(sent).not.toMatch(/ABC123|Jane|session|jane@/);
    expect(sent).toContain("/t/[redacted]");
  });

  it("redacts the URLs a breadcrumb records", () => {
    const breadcrumb: Breadcrumb = { category: "navigation", data: { from: "/t/ABC123", to: "/t/ABC123/collected" } };
    expect(sentryOptions.beforeBreadcrumb!(breadcrumb)?.data).toEqual({
      from: "/t/[redacted]",
      to: "/t/[redacted]/collected",
    });
  });

  it("drops the query and fragment a server http breadcrumb keeps apart from its url", () => {
    const breadcrumb: Breadcrumb = {
      category: "http",
      data: {
        url: "http://api.railway.internal:8080/locations/l1/tickets",
        "url.query": "?q=Jane",
        "url.fragment": "#x",
      },
    };
    expect(sentryOptions.beforeBreadcrumb!(breadcrumb)?.data).toEqual({
      url: "http://api.railway.internal:8080/locations/l1/tickets",
    });
  });
});
