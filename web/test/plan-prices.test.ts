import { describe, expect, it } from "vitest";
import { chargedAtTrialEnd, parsePlan, startsAtOnce } from "../src/app/(dashboard)/locations/[locationId]/plan-prices";

describe("startsAtOnce", () => {
  it("follows ADR 0033's order per month", () => {
    const essentielYearly = { plan: "ESSENTIEL", interval: "YEAR" } as const;
    const essentielMonthly = { plan: "ESSENTIEL", interval: "MONTH" } as const;
    const proYearly = { plan: "PRO", interval: "YEAR" } as const;
    const proMonthly = { plan: "PRO", interval: "MONTH" } as const;
    expect(startsAtOnce(essentielMonthly, proYearly)).toBe(true);
    expect(startsAtOnce(proYearly, proMonthly)).toBe(true);
    expect(startsAtOnce(proMonthly, proYearly)).toBe(false);
    expect(startsAtOnce(proYearly, essentielMonthly)).toBe(false);
    expect(startsAtOnce(essentielMonthly, essentielYearly)).toBe(false);
  });
});

describe("parsePlan", () => {
  it("accepts only our plans, as the value comes from a URL", () => {
    expect(parsePlan("PRO")).toBe("PRO");
    expect(parsePlan("ESSENTIEL")).toBe("ESSENTIEL");
    expect(parsePlan("undefined")).toBeNull();
    expect(parsePlan(["PRO"])).toBeNull();
  });
});

describe("chargedAtTrialEnd", () => {
  it("matches the API's 48 hours, days left rounding up", () => {
    expect(chargedAtTrialEnd(3)).toBe(true);
    expect(chargedAtTrialEnd(2)).toBe(false);
    expect(chargedAtTrialEnd(1)).toBe(false);
  });
});
