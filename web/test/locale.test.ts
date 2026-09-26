import { describe, expect, it } from "vitest";
import { parseLocale } from "../src/lib/locale";

describe("parseLocale", () => {
  it.each([
    ["fr", "FR"],
    ["FR", "FR"],
    ["en", "EN"],
  ])("reads %s as %s", (value, locale) => {
    expect(parseLocale(value)).toBe(locale);
  });

  it.each([null, undefined, "", "nl", "fr-BE"])("ignores %s", (value) => {
    expect(parseLocale(value)).toBeUndefined();
  });
});
