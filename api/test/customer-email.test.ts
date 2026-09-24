import { render } from "react-email";
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
    businessTypeCode: "GARAGE",
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
      // Every element that declares a language, not just <html>: a screen
      // reader switches pronunciation at each one.
      const langs = new Set(html.match(/ lang="[^"]*"/g));
      expect([...langs]).toEqual([` lang="${locale.toLowerCase()}"`]);
    });

    it("gives every kind its own subject", () => {
      const subjects = KINDS.map((kind) => buildCustomerEmail(input({ kind, locale })).subject);

      expect(new Set(subjects).size).toBe(KINDS.length);
    });
  });

  describe("names the job after the business type", () => {
    it.each([
      ["GARAGE", "EN", "Your repair at Joe's Garage is ready"],
      ["TAILORING", "EN", "Your alteration at Joe's Garage is ready"],
      ["OTHER", "EN", "Your job at Joe's Garage is ready"],
      ["GARAGE", "FR", "Votre réparation chez Joe's Garage est prête"],
      ["TAILORING", "FR", "Votre retouche chez Joe's Garage est prête"],
      ["PRESSING", "FR", "Votre dépôt chez Joe's Garage est prêt"],
      ["FRAMING", "FR", "Votre encadrement chez Joe's Garage est prêt"],
      ["OTHER", "FR", "Votre dépôt chez Joe's Garage est prêt"],
    ] as const)("%s in %s", (businessTypeCode, locale, subject) => {
      expect(buildCustomerEmail(input({ kind: "READY", locale, businessTypeCode })).subject).toBe(subject);
    });

    it("falls back to the default word for a business type it doesn't know", () => {
      const { subject } = buildCustomerEmail(input({ kind: "CANCELLED", locale: "FR", businessTypeCode: "NEW_TYPE" }));

      expect(subject).toBe("Votre dépôt chez Joe's Garage a été annulé");
    });

    it.each([
      ["TAILORING", ["Suivre ma retouche", "pour cette retouche", "venir la récupérer", "est prête"]],
      ["PRESSING", ["Suivre mon dépôt", "pour ce dépôt", "venir le récupérer", "est prêt"]],
      ["FRAMING", ["Suivre mon encadrement", "pour cet encadrement", "venir le récupérer", "est prêt"]],
    ] as const)("makes French agree with the %s noun", async (businessTypeCode, phrases) => {
      const { react } = buildCustomerEmail(input({ kind: "READY", locale: "FR", businessTypeCode }));
      const text = (await render(react, { plainText: true })).replace(/\s+/g, " ");

      for (const phrase of phrases) {
        expect(text).toContain(phrase);
      }
    });
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
