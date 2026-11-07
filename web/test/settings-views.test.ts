import { describe, expect, it } from "vitest";
import { shopSchema, turnaroundSchema } from "../src/app/(dashboard)/locations/[locationId]/settings/schema";
import {
  dayIsValid,
  dayName,
  hoursFrom,
  weekFrom,
  withBreak,
} from "../src/app/(dashboard)/locations/[locationId]/settings/settings-views";

const t = (key: string) => key;

describe("the week", () => {
  const hours = [
    { dayOfWeek: "Monday", opens: "09:00", closes: "12:30" },
    { dayOfWeek: "Monday", opens: "13:30", closes: "18:00" },
    { dayOfWeek: "Saturday", opens: "10:00", closes: "16:00" },
  ] as const;

  it("survives a round trip, a day without hours being closed", () => {
    const week = weekFrom([...hours]);
    expect(week.Monday).toHaveLength(2);
    expect(week.Sunday).toEqual([]);
    expect(hoursFrom(week)).toEqual(hours);
  });

  it("follows ADR 0034's rules for a day", () => {
    expect(dayIsValid([])).toBe(true);
    expect(dayIsValid([{ opens: "09:00", closes: "18:00" }])).toBe(true);
    expect(dayIsValid([{ opens: "18:00", closes: "09:00" }])).toBe(false);
    expect(dayIsValid([{ opens: "", closes: "18:00" }])).toBe(false);
    expect(
      dayIsValid([
        { opens: "09:00", closes: "13:00" },
        { opens: "12:00", closes: "18:00" },
      ]),
    ).toBe(false);
    expect(
      dayIsValid([
        { opens: "09:00", closes: "12:00" },
        { opens: "13:00", closes: "15:00" },
        { opens: "16:00", closes: "18:00" },
      ]),
    ).toBe(false);
  });

  it("splits a day around lunch", () => {
    expect(withBreak([{ opens: "09:00", closes: "18:00" }])).toEqual([
      { opens: "09:00", closes: "12:30" },
      { opens: "13:30", closes: "18:00" },
    ]);
  });

  it("names days in the page's language", () => {
    expect(dayName("Monday", "en-GB")).toBe("Monday");
    expect(dayName("Sunday", "fr")).toBe("Dimanche");
  });
});

describe("turnaroundSchema", () => {
  const parse = (value: string) => turnaroundSchema(t).safeParse(value);

  it("takes 1 to 60 open days, and empty to stop prefilling", () => {
    expect(parse("3").data).toBe(3);
    expect(parse("60").data).toBe(60);
    expect(parse(" ").data).toBeNull();
  });

  it.each(["0", "61", "1.5", "abc", "-1"])("refuses %s", (value) => {
    expect(parse(value).success).toBe(false);
  });
});

describe("shopSchema", () => {
  const shop = {
    name: "Atelier",
    contactPhone: "+32471318944",
    contactEmail: "shop@example.be",
    streetAddress: "",
    postalCode: "",
    addressLocality: "",
    addressCountry: "BE",
  };

  it("takes no address at all, or a whole one", () => {
    expect(shopSchema(t).safeParse(shop).success).toBe(true);
    expect(
      shopSchema(t).safeParse({ ...shop, streetAddress: "Rue 1", postalCode: "1000", addressLocality: "Bruxelles" })
        .success,
    ).toBe(true);
  });

  it("points at what's missing from a partial address", () => {
    const paths = shopSchema(t)
      .safeParse({ ...shop, streetAddress: "Rue 1" })
      .error?.issues.map(({ path }) => path[0]);
    expect(paths).toEqual(["postalCode", "addressLocality"]);
  });
});
