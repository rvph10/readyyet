import { describe, expect, it } from "vitest";
import { maskSearchTerm, maskTrackingCode, withoutQueryArguments } from "../src/common/logging/redact";

describe("redact", () => {
  it("masks the tracking code in a path, a full URL or a transaction name", () => {
    expect(maskTrackingCode("/tracking/AbC-123_xyz0?utm=mail")).toBe("/tracking/[redacted]?utm=mail");
    expect(maskTrackingCode("https://api.readyyet.app/tracking/AbC-123_xyz0/stop-notifications")).toBe(
      "https://api.readyyet.app/tracking/[redacted]/stop-notifications",
    );
    expect(maskTrackingCode("GET /tracking/AbC-123_xyz0")).toBe("GET /tracking/[redacted]");
    expect(maskTrackingCode("/locations/abc/tickets")).toBe("/locations/abc/tickets");
  });

  it("masks the search term, keeping the other filters", () => {
    expect(maskSearchTerm("/locations/abc/tickets?state=open&q=Jane%20Doe&take=10")).toBe(
      "/locations/abc/tickets?state=open&q=[redacted]&take=10",
    );
    expect(maskSearchTerm("/locations/abc/customers?q=Jane")).toBe("/locations/abc/customers?q=[redacted]");
    expect(maskSearchTerm("/locations/abc/tickets?state=open")).toBe("/locations/abc/tickets?state=open");
    expect(maskSearchTerm("/locations/abc/customers?q=Jane&q=Doe")).toBe(
      "/locations/abc/customers?q=[redacted]&q=[redacted]",
    );
  });

  it("keeps which Prisma call failed and why, not the values it was called with", () => {
    const message = [
      "",
      "Invalid `prisma.customer.create()` invocation:",
      "",
      "{",
      "  data: {",
      '    fullName: "Jane Doe",',
      '    email: "jane@example.com",',
      "  }",
      "}",
      "",
      "Argument `location` is missing.",
    ].join("\n");

    expect(withoutQueryArguments(message)).toBe(
      "Invalid `prisma.customer.create()` invocation: Argument `location` is missing.",
    );
  });
});
