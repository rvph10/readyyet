import { render } from "react-email";
import { describe, expect, it } from "vitest";
import { buildCustomerEmail, type CustomerEmailInput } from "../src/notification/customer-email/customer-email";
import { type CustomerEmailKind } from "../src/notification/customer-email/messages";

const KINDS: CustomerEmailKind[] = [
  "TICKET_CREATED",
  "READY_DATE_CHANGED",
  "READY_REMINDER",
  "FEEDBACK_REQUEST",
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
    estimatedReadyDate: null,
    location: {
      name: "Joe's Garage",
      contactPhone: "+3221234567",
      contactEmail: "shop@joes.test",
      address: null,
      logoUrl: null,
    },
    trackingUrl: "https://readyyet.app/t/AbC123xyz789",
    collectedUrl: "https://readyyet.app/t/AbC123xyz789/collected",
    asksForFeedback: false,
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

  describe("estimated ready date", () => {
    // Tuesday 29 September 2026.
    const estimatedReadyDate = "2026-09-29";
    const text = async (overrides: Partial<CustomerEmailInput>) =>
      (
        await render(buildCustomerEmail(input({ estimatedReadyDate, ...overrides })).react, { plainText: true })
      ).replace(/\s+/g, " ");

    it.each([
      ["EN", "GARAGE", "It should be ready on Tuesday 29 September."],
      ["FR", "TAILORING", "Elle devrait être prête le mardi 29 septembre."],
      ["FR", "PRESSING", "Il devrait être prêt le mardi 29 septembre."],
    ] as const)("is written out in the %s ticket-created email for %s", async (locale, businessTypeCode, sentence) => {
      expect(await text({ kind: "TICKET_CREATED", locale, businessTypeCode })).toContain(sentence);
    });

    it("is left out of the ticket-created email when there's none, and of status emails", async () => {
      expect(await text({ kind: "TICKET_CREATED", estimatedReadyDate: null })).not.toContain("should be ready");
      expect(await text({ kind: "AWAITING_APPROVAL" })).not.toContain("29 September");
    });

    it("is the news of a READY_DATE_CHANGED email", async () => {
      expect(await text({ kind: "READY_DATE_CHANGED" })).toContain(
        'Joe\'s Garage needs a little more time for your repair "Brake pads". It should now be ready on Tuesday 29 September.',
      );
      expect(await text({ kind: "READY_DATE_CHANGED", locale: "FR", businessTypeCode: "TAILORING" })).toContain(
        "Elle devrait maintenant être prête le mardi 29 septembre.",
      );
    });
  });

  describe("ready reminder", () => {
    it.each([
      ["EN", "GARAGE", "I already picked it up"],
      ["FR", "TAILORING", "Je l'ai déjà récupérée"],
      ["FR", "PRESSING", "Je l'ai déjà récupéré"],
    ] as const)("links %s %s to the collected page", async (locale, businessTypeCode, label) => {
      const html = await render(buildCustomerEmail(input({ kind: "READY_REMINDER", locale, businessTypeCode })).react);

      expect(html).toMatch(
        new RegExp(`href="https://readyyet.app/t/AbC123xyz789/collected"[^>]*>${label.replace("'", "&#x27;")}</a>`),
      );
    });

    it("leaves the collected link out of every other email", async () => {
      const html = await render(buildCustomerEmail(input({ kind: "READY" })).react);

      expect(html).not.toContain("/collected");
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
      input({
        location: {
          name: "Joe's\r\nBcc: victim@example.test",
          contactPhone: "+32",
          contactEmail: "a@b.test",
          address: null,
          logoUrl: null,
        },
      }),
    );

    expect(subject).not.toMatch(/[\r\n]/);
  });

  it("shows the Location's address as a Google Maps link when it has one", async () => {
    const address = {
      streetAddress: "Rue Neuve 12",
      postalCode: "1000",
      addressLocality: "Bruxelles",
      addressCountry: "BE",
    };
    const html = await render(buildCustomerEmail(input({ location: { ...input().location, address } })).react);

    expect(html).toContain(">Rue Neuve 12, 1000 Bruxelles</a>");
    expect(html).toContain(
      "https://www.google.com/maps/search/?api=1&amp;query=Rue%20Neuve%2012%2C%201000%20Bruxelles%2C%20BE",
    );
  });

  it("leaves the address out when the Location has none", async () => {
    const html = await render(buildCustomerEmail(input()).react);

    expect(html).not.toContain("google.com/maps");
  });

  it("shows the Location's logo above its name when it has one", async () => {
    const logoUrl = "https://api.readyyet.app/images/logos/0b7c7a9e-3f2a-4d7e-9a53-1c2d3e4f5a6b.png";
    const html = await render(buildCustomerEmail(input({ location: { ...input().location, logoUrl } })).react);

    expect(html).toMatch(new RegExp(`<img[^>]+src="${logoUrl}"[^>]*>.*Joe&#x27;s Garage</h1>`, "s"));
  });

  it("shows no image when the Location has no logo", async () => {
    const html = await render(buildCustomerEmail(input()).react);

    expect(html).not.toContain("<img");
  });

  describe("feedback (ADR 0039)", () => {
    it.each([
      ["EN", "How did your repair at Joe's Garage go?", "Tell us how it went"],
      // The subject is flattened to one line, a non-breaking space included.
      ["FR", "Comment s'est passée votre réparation chez Joe's Garage ?", "Donner mon avis"],
    ] as const)("asks how it went in %s, with a button to the tracking page", async (locale, subject, button) => {
      const email = buildCustomerEmail(input({ kind: "FEEDBACK_REQUEST", locale }));
      const html = await render(email.react);

      expect(email.subject).toBe(subject);
      expect(html).toContain(button);
      expect(html).toContain('href="https://readyyet.app/t/AbC123xyz789"');
    });

    it("never links to Google", async () => {
      const html = await render(buildCustomerEmail(input({ kind: "FEEDBACK_REQUEST" })).react);

      expect(html).not.toMatch(/google|g\.page|goo\.gl/i);
    });

    it("tells the Customer at drop-off, only when the Location asks for feedback", async () => {
      const notice = "Once you've picked it up, you'll get one email asking how it went.";
      const asks = await render(buildCustomerEmail(input({ kind: "TICKET_CREATED", asksForFeedback: true })).react);
      const silent = await render(buildCustomerEmail(input({ kind: "TICKET_CREATED" })).react);
      const status = await render(buildCustomerEmail(input({ kind: "READY", asksForFeedback: true })).react);

      expect(asks).toContain("Once you&#x27;ve picked it up");
      expect(silent).not.toContain(notice.slice(0, 20));
      expect(status).not.toContain("Once you&#x27;ve picked it up");
    });
  });
});
