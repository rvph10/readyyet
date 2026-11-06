import { describe, expect, it } from "vitest";
import { startsAtOnce } from "../src/app/(dashboard)/locations/[locationId]/plan-prices";

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
