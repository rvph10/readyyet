import { describe, expect, it } from "vitest";
import {
  attentionHref,
  attentionItems,
  busiest,
  hasPaid,
  monthlyCost,
  nextPayment,
  payingCount,
  planMix,
  planState,
  sumCounts,
  weekTotals,
  type BusinessLocation,
} from "../src/app/(dashboard)/(business)/businesses/[businessId]/business-views";

const billing = (changes: Partial<BusinessLocation["billing"]> = {}): BusinessLocation["billing"] => ({
  status: "ACTIVE",
  plan: "PRO",
  interval: "MONTH",
  trialEndsAt: null,
  currentPeriodEnd: "2026-12-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  scheduledPlan: null,
  scheduledInterval: null,
  frozen: false,
  memberLimit: null,
  referralDiscount: false,
  ...changes,
});

const location = (name: string, changes: Partial<BusinessLocation> = {}): BusinessLocation => ({
  id: name,
  name,
  billing: billing(),
  daysLeft: null,
  timeZone: "Europe/Brussels",
  counts: null,
  handedOver: null,
  ...changes,
});

const counts = (changes: Partial<NonNullable<BusinessLocation["counts"]>>) =>
  ({ open: 0, ready: 0, late: 0, unhandledFeedback: 0, ...changes }) as NonNullable<BusinessLocation["counts"]>;

const unpaid = billing({ status: "ENDED", plan: null, interval: null, currentPeriodEnd: null, frozen: true });

describe("planState", () => {
  it("says the worst thing first", () => {
    expect(planState(billing({ status: "PAST_DUE", frozen: true }))).toBe("paused");
    expect(planState(billing({ status: "PAST_DUE", cancelAtPeriodEnd: true }))).toBe("failed");
    expect(planState(billing({ cancelAtPeriodEnd: true, scheduledPlan: "ESSENTIEL" }))).toBe("stopping");
  });

  it("names each state", () => {
    expect(planState(unpaid)).toBe("paused");
    expect(planState(billing({ status: "TRIAL" }))).toBe("trial");
    expect(planState(billing({ scheduledPlan: "ESSENTIEL" }))).toBe("changing");
    expect(planState(billing())).toBe("active");
  });
});

describe("monthlyCost", () => {
  it("adds paying Locations and counts a yearly plan by the month", () => {
    const locations = [
      location("Pro"),
      location("Yearly", { billing: billing({ plan: "ESSENTIEL", interval: "YEAR" }) }),
      location("Trial", { billing: billing({ status: "TRIAL" }) }),
      location("Unpaid", { billing: unpaid }),
    ];
    expect(monthlyCost(locations)).toBeCloseTo(49 + 290 / 12);
    expect(payingCount(locations)).toBe(2);
  });
});

describe("nextPayment", () => {
  it("is the soonest renewal, and skips a plan that's stopping", () => {
    const next = nextPayment([
      location("Later", { billing: billing({ currentPeriodEnd: "2026-12-20T00:00:00.000Z" }) }),
      location("Stopping", {
        billing: billing({ currentPeriodEnd: "2026-11-10T00:00:00.000Z", cancelAtPeriodEnd: true }),
      }),
      location("Soon", { billing: billing({ currentPeriodEnd: "2026-12-01T00:00:00.000Z" }) }),
    ]);
    expect(next?.location.name).toBe("Soon");
    expect(next?.amount).toBe(49);
  });

  it("charges what a waiting move will cost", () => {
    const next = nextPayment([
      location("Moving", { billing: billing({ scheduledPlan: "ESSENTIEL", scheduledInterval: "YEAR" }) }),
    ]);
    expect(next?.amount).toBe(290);
  });

  it("leaves a failed payment out, as Stripe retries it on no known date", () => {
    expect(nextPayment([location("Failed", { billing: billing({ status: "PAST_DUE" }) })])).toBeNull();
  });

  it("is nothing when no one pays", () => {
    expect(nextPayment([location("Unpaid", { billing: unpaid })])).toBeNull();
  });
});

describe("hasPaid", () => {
  it("offers Stripe's portal after a plan ended, not before any plan", () => {
    expect(hasPaid([location("Ended", { billing: billing({ status: "ENDED", frozen: true }) })])).toBe(true);
    expect(hasPaid([location("Unpaid", { billing: unpaid })])).toBe(false);
    expect(hasPaid([location("Trial", { billing: billing({ status: "TRIAL" }) })])).toBe(false);
  });
});

describe("sumCounts", () => {
  it("adds what's known, and is null when nothing is", () => {
    expect(sumCounts([location("A", { counts: counts({ late: 2 }) }), location("B")], "late")).toBe(2);
    expect(sumCounts([location("B")], "late")).toBeNull();
  });
});

describe("attentionItems", () => {
  it("puts a stopped shop before late Tickets, and leaves out what's fine", () => {
    const items = attentionItems([
      location("Late", { counts: counts({ late: 3 }) }),
      location("Unpaid", { billing: unpaid, daysLeft: 0 }),
      location("Calm", { counts: counts({}) }),
    ]);
    expect(items.map(({ kind, location: { name } }) => [kind, name])).toEqual([
      ["paused", "Unpaid"],
      ["late", "Late"],
    ]);
  });

  it("only raises a trial near its end", () => {
    expect(attentionItems([location("Near", { daysLeft: 1 })]).map(({ kind }) => kind)).toEqual(["trial"]);
    expect(attentionItems([location("Far", { daysLeft: 12 })])).toEqual([]);
  });

  it("leads each item to where it's fixed", () => {
    const [item] = attentionItems([location("Shop", { counts: counts({ unhandledFeedback: 1 }) })]);
    expect(attentionHref(item)).toBe("/locations/Shop/feedback");
  });
});

describe("busiest", () => {
  it("names the Location with the most, and nothing when all are at zero", () => {
    const locations = [location("A", { counts: counts({ late: 1 }) }), location("B", { counts: counts({ late: 4 }) })];
    expect(busiest(locations, "late")).toBe("B");
    expect(busiest(locations, "ready")).toBeNull();
  });
});

describe("weekTotals", () => {
  const week = (first: number, previousWeek: number) => ({
    days: [
      { date: "2026-11-05", count: first },
      { date: "2026-11-06", count: 1 },
    ],
    previousWeek,
  });

  it("adds each day across Locations, skipping one that failed to load", () => {
    expect(
      weekTotals([location("A", { handedOver: week(2, 5) }), location("B"), location("C", { handedOver: week(3, 1) })]),
    ).toEqual({
      days: [
        { date: "2026-11-05", count: 5 },
        { date: "2026-11-06", count: 2 },
      ],
      previousWeek: 6,
    });
  });

  it("is nothing when no Location loaded", () => {
    expect(weekTotals([location("A")])).toBeNull();
  });
});

describe("planMix", () => {
  it("orders plans first, and counts a trial and a stopped Location as no plan", () => {
    const mix = planMix([
      location("Trial", { billing: billing({ status: "TRIAL" }) }),
      location("Essentiel", { billing: billing({ plan: "ESSENTIEL" }) }),
      location("Unpaid", { billing: unpaid }),
      location("Failed", { billing: billing({ status: "PAST_DUE" }) }),
    ]);
    expect(mix.map(({ key, members }) => [key, members.map(({ name }) => name)])).toEqual([
      ["PRO", ["Failed"]],
      ["ESSENTIEL", ["Essentiel"]],
      ["NONE", ["Trial", "Unpaid"]],
    ]);
  });
});
