import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { buildCustomerEmail, type CustomerEmailInput } from "../src/notification/customer-email/customer-email";
import { type CustomerEmailKind } from "../src/notification/customer-email/messages";

const KINDS: CustomerEmailKind[] = [
  "TICKET_CREATED",
  "READY",
  "AWAITING_APPROVAL",
  "AWAITING_CLIENT_INFO",
  "CANCELLED",
  "REJECTED",
];

function input(overrides: Partial<CustomerEmailInput> = {}): CustomerEmailInput {
  return {
    kind: "READY",
    locale: "EN",
    customerName: "Alice Martin",
    ticketTitle: "Brake pads",
    location: { name: "Joe's Garage", contactPhone: "+3221234567", contactEmail: "shop@joes.test" },
    trackingUrl: "https://readyyet.app/t/AbC123xyz789",
    stopUpdatesUrl: "https://readyyet.app/t/AbC123xyz789/stop-updates",
    ...overrides,
  };
}

describe("Customer emails", () => {
  describe.each(["EN", "FR"] as const)("in %s", (locale) => {
    it.each(KINDS)("renders %s with the tracking link, the shop's contact details and the stop link", async (kind) => {
      const { subject, react } = buildCustomerEmail(input({ kind, locale }));
      const html = await render(react);
      const text = await render(react, { plainText: true });

      expect(subject).toContain("Joe's Garage");
      for (const content of [html, text]) {
        expect(content).toContain("https://readyyet.app/t/AbC123xyz789");
        expect(content).toContain("https://readyyet.app/t/AbC123xyz789/stop-updates");
        expect(content).toContain("+3221234567");
        expect(content).toContain("shop@joes.test");
      }
      expect(text).toContain("Alice Martin");
      expect(text).toContain("Brake pads");
      expect(html).toContain(`lang="${locale.toLowerCase()}"`);
    });

    it("gives every kind its own subject", () => {
      const subjects = KINDS.map((kind) => buildCustomerEmail(input({ kind, locale })).subject);

      expect(new Set(subjects).size).toBe(KINDS.length);
    });
  });

  it("writes French with French wording", () => {
    const { subject } = buildCustomerEmail(input({ kind: "READY", locale: "FR" }));

    expect(subject).toBe("Votre dépôt chez Joe's Garage est prêt");
  });

  it("escapes user-entered text instead of rendering it as HTML", async () => {
    const { react } = buildCustomerEmail(
      input({ customerName: "<b>Mallory</b>", ticketTitle: '<script>alert("x")</script>' }),
    );
    const html = await render(react);

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Mallory</b>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps the subject on one line when a location name contains a line break", () => {
    const { subject } = buildCustomerEmail(
      input({ location: { name: "Joe's\r\nBcc: victim@example.test", contactPhone: "+32", contactEmail: "a@b.test" } }),
    );

    expect(subject).not.toMatch(/[\r\n]/);
  });
});
