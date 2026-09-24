import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import {
  buildAccountDeletedEmail,
  buildInvitationEmail,
  buildNewOwnerEmail,
  buildPreviousOwnerEmail,
  buildSignInCodeEmail,
  type InvitationEmailInput,
  localeFromAcceptLanguage,
} from "../src/notification/staff-email/staff-email";

async function rendered(react: Parameters<typeof render>[0]) {
  return [await render(react), await render(react, { plainText: true })];
}

describe("localeFromAcceptLanguage", () => {
  it.each([
    ["fr-BE,fr;q=0.9,en;q=0.8", "FR"],
    ["nl-BE,nl;q=0.9,fr;q=0.8,en;q=0.7", "FR"],
    ["en-US,en;q=0.9", "EN"],
    ["de-DE", "EN"],
    ["fr;q=0,en", "EN"],
    ["en;q=0.5,fr;q=0.9", "FR"],
    ["", "EN"],
    [undefined, "EN"],
    ["constructor,__proto__", "EN"],
  ])("reads %s as %s", (header, locale) => {
    expect(localeFromAcceptLanguage(header)).toBe(locale);
  });
});

describe("Sign-in code email", () => {
  it.each([
    ["EN", "Your ReadyYet sign-in code", "5 minutes"],
    ["FR", "Votre code de connexion ReadyYet", "5 minutes"],
  ] as const)("in %s, shows the code and when it expires", async (locale, subject, expiry) => {
    const email = buildSignInCodeEmail({ locale, code: "482913", expiresInMinutes: 5 });

    expect(email.subject).toBe(subject);
    for (const content of await rendered(email.react)) {
      expect(content).toContain("482913");
      expect(content).toContain(expiry);
    }
  });

  it("keeps the code out of the subject and the inbox preview", async () => {
    const email = buildSignInCodeEmail({ locale: "EN", code: "482913", expiresInMinutes: 5 });
    const html = await render(email.react);

    expect(email.subject).not.toContain("482913");
    expect(html.indexOf("482913")).toBeGreaterThan(html.indexOf("Enter this code"));
  });
});

describe("Invitation email", () => {
  const input = (overrides: Partial<InvitationEmailInput> = {}): InvitationEmailInput => ({
    locale: "EN",
    inviter: "Joe Martin",
    location: "Joe's Garage Downtown",
    business: "Joe's Garage",
    role: "EMPLOYEE",
    email: "sam@example.test",
    expiresInDays: 7,
    acceptUrl: "https://readyyet.app/invitations/0f8fad5b-d9cb-469f-a165-70867728950e",
    ...overrides,
  });

  it("says who invited them, where, as what, and how to accept", async () => {
    const email = buildInvitationEmail(input());

    expect(email.subject).toBe("Joe Martin invited you to join Joe's Garage Downtown on ReadyYet");
    const [html, text] = await rendered(email.react);
    expect(text).toContain("the team at Joe's Garage Downtown (Joe's Garage) as an employee");
    for (const content of [html, text]) {
      expect(content).toContain("sam@example.test");
      expect(content).toContain("https://readyyet.app/invitations/0f8fad5b-d9cb-469f-a165-70867728950e");
      expect(content).toContain("expires in 7 days");
    }
  });

  it("is written in French for a French location", async () => {
    const email = buildInvitationEmail(input({ locale: "FR", role: "ADMIN" }));

    expect(email.subject).toBe("Joe Martin vous invite à rejoindre Joe's Garage Downtown sur ReadyYet");
    const [html] = await rendered(email.react);
    expect(html).toContain("en tant qu&#x27;administrateur");
    expect(html).toContain("Accepter l&#x27;invitation");
  });

  it("keeps the subject to one line", () => {
    const email = buildInvitationEmail(input({ location: "Evil\r\nBcc: victim@example.test" }));

    expect(email.subject).not.toMatch(/[\r\n]/);
  });
});

describe("Ownership transfer emails", () => {
  const transfer = {
    business: "Joe's Garage",
    previousOwner: "Joe Martin",
    newOwner: "Sam Leroy",
    newOwnerEmail: "sam@example.test",
  };

  it.each([
    ["EN", "You're now the owner of Joe's Garage on ReadyYet"],
    ["FR", "Vous êtes maintenant propriétaire de Joe's Garage sur ReadyYet"],
  ] as const)("tells the new owner in %s what they received, with a way in", async (locale, subject) => {
    const email = buildNewOwnerEmail({ ...transfer, locale, appUrl: "https://readyyet.app" });

    expect(email.subject).toBe(subject);
    const [html, text] = await rendered(email.react);
    expect(text).toContain("Joe Martin");
    expect(html).toContain('href="https://readyyet.app"');
  });

  it.each([
    ["EN", "You transferred Joe's Garage to Sam Leroy", "reply to this email"],
    ["FR", "Vous avez transféré Joe's Garage à Sam Leroy", "répondez à cet e-mail"],
  ] as const)(
    "tells the previous owner in %s who has it now, and what to do if it wasn't them",
    async (locale, subject, notYou) => {
      const email = buildPreviousOwnerEmail({ ...transfer, locale });

      expect(email.subject).toBe(subject);
      const [, text] = await rendered(email.react);
      expect(text).toContain("sam@example.test");
      expect(text).toContain(notYou);
    },
  );
});

describe("Account deleted email", () => {
  it.each([
    ["EN", "Your ReadyYet account was deleted", "reply to this email"],
    ["FR", "Votre compte ReadyYet a été supprimé", "répondez à cet e-mail"],
  ] as const)("in %s, names the account and says what to do if it wasn't them", async (locale, subject, notYou) => {
    const email = buildAccountDeletedEmail({ locale, email: "sam@example.test" });

    expect(email.subject).toBe(subject);
    const [, text] = await rendered(email.react);
    expect(text).toContain("sam@example.test");
    expect(text).toContain(notYou);
  });
});
