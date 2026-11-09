import "dotenv/config";
import { INestApplication } from "@nestjs/common";
import { Plan, SubscriptionStatus } from "@readyyet/db";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../src/database/prisma.service";
import { createTestApp } from "./support/create-test-app";
import { signInViaOtp } from "./support/sign-in-via-otp";

const GOOGLE = "https://places.googleapis.com/v1/places:searchText";

// What Google answers, trimmed to the fields asked for.
const PLACES = {
  places: [
    {
      id: "ChIJlUcTsJrEw0cRZqSMDlRHCK8",
      displayName: { text: "Velo Ixelles" },
      formattedAddress: "Rue du Trône 100, 1050 Ixelles, Belgium",
      rating: 4.8,
      userRatingCount: 592,
      addressComponents: [
        { longText: "100", shortText: "100", types: ["street_number"] },
        { longText: "Rue du Trône", shortText: "Rue du Trône", types: ["route"] },
        { longText: "Ixelles", shortText: "Ixelles", types: ["locality", "political"] },
        { longText: "1050", shortText: "1050", types: ["postal_code"] },
        { longText: "Belgium", shortText: "BE", types: ["country", "political"] },
      ],
      regularOpeningHours: {
        periods: [
          // Sunday closed. Monday split, Saturday morning.
          { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 12, minute: 30 } },
          { open: { day: 1, hour: 13, minute: 30 }, close: { day: 1, hour: 18, minute: 0 } },
          { open: { day: 6, hour: 10, minute: 0 }, close: { day: 6, hour: 13, minute: 0 } },
        ],
      },
    },
    {
      // No public address, open around the clock: neither is offered.
      id: "ChIJother",
      displayName: { text: "Velo 24/7" },
      addressComponents: [{ longText: "Belgium", shortText: "BE", types: ["country"] }],
      regularOpeningHours: { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] },
    },
    {
      // No street number, and hours Save would refuse: neither is offered.
      id: "ChIJbacktoback",
      displayName: { text: "Velo Midi" },
      addressComponents: [
        { longText: "Rue Haute", shortText: "Rue Haute", types: ["route"] },
        { longText: "Bruxelles", shortText: "Bruxelles", types: ["locality"] },
        { longText: "1000", shortText: "1000", types: ["postal_code"] },
        { longText: "Belgium", shortText: "BE", types: ["country"] },
      ],
      regularOpeningHours: {
        periods: [
          { open: { day: 2, hour: 9, minute: 0 }, close: { day: 2, hour: 12, minute: 0 } },
          { open: { day: 2, hour: 12, minute: 0 }, close: { day: 2, hour: 18, minute: 0 } },
        ],
      },
    },
    {
      // Closes at midnight, which Google puts on the next day.
      id: "ChIJmidnight",
      displayName: { text: "Velo Minuit" },
      regularOpeningHours: {
        periods: [{ open: { day: 5, hour: 18, minute: 0 }, close: { day: 6, hour: 0, minute: 0 } }],
      },
    },
  ],
};

// ADR 0126: finding a shop on Google Maps for its review link, address and hours.
describe("Finding a shop on Google", () => {
  let app: INestApplication;
  let ownerCookie: string;
  let employeeCookie: string;
  let locationId: string;
  const stamp = Date.now();
  const realFetch = globalThis.fetch;
  let google: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeAll(async () => {
    // Google is faked here, any key will do where none is set.
    process.env.GOOGLE_PLACES_API_KEY ??= "test-key";
    app = await createTestApp();
    const prisma = app.get(PrismaService);
    ownerCookie = await signInViaOtp(app, prisma, `delivered+places-owner-${stamp}@resend.dev`);
    const created = await request(app.getHttpServer())
      .post("/businesses")
      .set("Cookie", ownerCookie)
      .send({
        name: "Places Test",
        location: {
          name: "Velo Ixelles",
          businessTypeCode: "GARAGE",
          timeZone: "Europe/Brussels",
          contactPhone: "+32470123456",
          contactEmail: "atelier@velo.test",
          locale: "FR",
        },
      });
    locationId = created.body.locations[0].id;
    const employeeEmail = `delivered+places-employee-${stamp}@resend.dev`;
    employeeCookie = await signInViaOtp(app, prisma, employeeEmail);
    const invitation = await request(app.getHttpServer())
      .post(`/locations/${locationId}/invitations`)
      .set("Cookie", ownerCookie)
      .send({ email: employeeEmail, role: "EMPLOYEE" });
    await request(app.getHttpServer()).post(`/invitations/${invitation.body.id}/accept`).set("Cookie", employeeCookie);
  });

  // Only Google is faked, the test's own requests go through.
  function answerGoogle(status: number, body: unknown) {
    // fetch is typed by Node's undici, Response here by the DOM lib: the same object.
    const answer = () => new Response(JSON.stringify(body), { status }) as unknown as Awaited<ReturnType<typeof fetch>>;
    google = vi.fn<typeof fetch>(() => Promise.resolve(answer()));
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
      input === GOOGLE ? google(input, init) : realFetch(input, init),
    );
  }

  function search(cookie: string, q = "Velo Ixelles") {
    return request(app.getHttpServer())
      .get(`/locations/${locationId}/google-places`)
      .query({ q })
      .set("Cookie", cookie);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers places in ReadyYet's shapes, with a review link that can be saved", async () => {
    answerGoogle(200, PLACES);

    const response = await search(ownerCookie);

    expect(response.status).toBe(200);
    const [shop, open247, backToBack, midnight] = response.body.places;
    expect(shop).toEqual({
      placeId: "ChIJlUcTsJrEw0cRZqSMDlRHCK8",
      name: "Velo Ixelles",
      formattedAddress: "Rue du Trône 100, 1050 Ixelles, Belgium",
      rating: 4.8,
      ratingCount: 592,
      reviewUrl: "https://search.google.com/local/writereview?placeid=ChIJlUcTsJrEw0cRZqSMDlRHCK8",
      address: {
        streetAddress: "Rue du Trône 100",
        postalCode: "1050",
        addressLocality: "Ixelles",
        addressCountry: "BE",
      },
      openingHours: [
        { dayOfWeek: "Monday", opens: "09:00", closes: "12:30" },
        { dayOfWeek: "Monday", opens: "13:30", closes: "18:00" },
        { dayOfWeek: "Saturday", opens: "10:00", closes: "13:00" },
      ],
    });
    expect(open247).toMatchObject({ formattedAddress: null, address: null, openingHours: [], rating: null });
    expect(backToBack).toMatchObject({ address: null, openingHours: [] });
    expect(midnight.openingHours).toEqual([{ dayOfWeek: "Friday", opens: "18:00", closes: "23:59" }]);

    const saved = await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .set("Cookie", ownerCookie)
      .send({ googleReviewUrl: shop.reviewUrl, address: shop.address, openingHours: shop.openingHours });
    expect(saved.status).toBe(200);
  });

  it("asks Google in the shop's language, Belgium when it has no address yet", async () => {
    answerGoogle(200, { places: [] });
    await request(app.getHttpServer())
      .patch(`/locations/${locationId}`)
      .set("Cookie", ownerCookie)
      .send({ address: null });

    const response = await search(ownerCookie, "  Velo   ");

    expect(response.body).toEqual({ places: [] });
    const [, init] = google.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      textQuery: "Velo",
      languageCode: "fr",
      regionCode: "BE",
      includePureServiceAreaBusinesses: true,
    });
    expect((init.headers as Record<string, string>)["x-goog-fieldmask"]).not.toContain("reviews");
  });

  it("fails without telling the shop Google's error", async () => {
    answerGoogle(403, { error: { message: "API key not valid" } });

    const response = await search(ownerCookie);

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain("API key");
  });

  it("is for Owners and Admins only", async () => {
    answerGoogle(200, PLACES);

    expect((await search(employeeCookie)).status).toBe(403);
    expect(google).not.toHaveBeenCalled();
  });

  it("needs something to search for", async () => {
    answerGoogle(200, PLACES);

    expect((await search(ownerCookie, "   ")).status).toBe(400);
  });

  it("is not for another Business's members", async () => {
    answerGoogle(200, PLACES);
    const stranger = await signInViaOtp(app, app.get(PrismaService), `delivered+places-stranger-${stamp}@resend.dev`);

    expect((await search(stranger)).status).not.toBe(200);
    expect(google).not.toHaveBeenCalled();
  });

  it("needs Pro, as the review link it's for does", async () => {
    answerGoogle(200, PLACES);
    const prisma = app.get(PrismaService);
    const before = await prisma.subscription.findUniqueOrThrow({ where: { locationId } });
    await prisma.subscription.update({
      where: { locationId },
      data: { plan: Plan.ESSENTIEL, status: SubscriptionStatus.ACTIVE, trialEndsAt: null },
    });

    const response = await search(ownerCookie);

    await prisma.subscription.update({
      where: { locationId },
      data: { plan: before.plan, status: before.status, trialEndsAt: before.trialEndsAt },
    });
    expect(response.status).toBe(402);
    expect(google).not.toHaveBeenCalled();
  });

  it("stops a Location at thirty searches a day", async () => {
    answerGoogle(200, { places: [] });
    const statuses: number[] = [];
    for (let n = 0; n < 35; n++) {
      // Each from its own address, so the per-minute limit isn't what stops it.
      const response = await search(ownerCookie).set("X-Real-IP", `100.65.0.${n + 1}`);
      statuses.push(response.status);
    }

    expect(statuses.at(-1)).toBe(429);
    expect(google.mock.calls.length).toBeLessThanOrEqual(30);
  });
});
