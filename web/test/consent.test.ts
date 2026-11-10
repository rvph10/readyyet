import { describe, expect, it, vi } from "vitest";
import type { CaptureResult } from "posthog-js";
import { consentCookie, cookieDomain, POSTHOG_OPTIONS, readConsent } from "../src/lib/consent";

describe("readConsent", () => {
  it.each([
    ["cookie-consent=granted", "granted"],
    ["locale=fr; cookie-consent=denied; sidebar=open", "denied"],
    ["", null],
    ["cookie-consent=maybe", null],
    ["my-cookie-consent=granted", null],
  ])("reads %j as %s", (cookies, consent) => {
    expect(readConsent(cookies)).toBe(consent);
  });
});

describe("cookieDomain", () => {
  it.each([
    ["app.readyyet.app", "readyyet.app"],
    ["readyyet.app", "readyyet.app"],
    ["app.readyyet-staging.app", "readyyet-staging.app"],
    ["localhost", null],
    ["192.168.129.156", null],
  ])("shares the answer of %s on %s", (hostname, domain) => {
    expect(cookieDomain(hostname)).toBe(domain);
  });
});

describe("consentCookie", () => {
  it("lasts 6 months on the parent domain", () => {
    expect(consentCookie("granted", "app.readyyet.app", true)).toBe(
      "cookie-consent=granted; path=/; max-age=15724800; samesite=lax; domain=readyyet.app; secure",
    );
  });

  it("stays on the host locally", () => {
    expect(consentCookie("denied", "localhost", false)).toBe(
      "cookie-consent=denied; path=/; max-age=15724800; samesite=lax",
    );
  });
});

describe("what reaches PostHog", () => {
  const beforeSend = POSTHOG_OPTIONS.before_send as (event: CaptureResult) => CaptureResult | null;
  const pageview = (url: string) =>
    ({ event: "$pageview", properties: { $current_url: url, $referrer: `${url}&from=x` } }) as unknown as CaptureResult;

  it("drops the query, which can hold a search for a Customer", () => {
    vi.stubGlobal("location", { pathname: "/locations/1/tickets" });
    const sent = beforeSend(pageview("https://app.readyyet.app/locations/1/tickets?q=0470123456"));
    expect(sent?.properties).toMatchObject({
      $current_url: "https://app.readyyet.app/locations/1/tickets",
      $referrer: "https://app.readyyet.app/locations/1/tickets",
    });
  });

  it("sends nothing from a Customer's tracking page", () => {
    vi.stubGlobal("location", { pathname: "/t/ABC123" });
    expect(beforeSend(pageview("https://app.readyyet.app/t/ABC123"))).toBeNull();
  });

  it("loads no more than page views", () => {
    expect(POSTHOG_OPTIONS).toMatchObject({
      autocapture: false,
      disable_session_recording: true,
      disable_external_dependency_loading: true,
      person_profiles: "never",
    });
  });
});
