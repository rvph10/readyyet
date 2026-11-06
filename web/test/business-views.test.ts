import { describe, expect, it } from "vitest";
import {
  hasPaid,
  nextPayment,
  planState,
  stoppedCount,
  teamInvitations,
  teamPeople,
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
  ...changes,
});

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

describe("stoppedCount", () => {
  it("counts a stopped plan and a failed payment, not a trial", () => {
    expect(
      stoppedCount([
        location("Unpaid", { billing: unpaid }),
        location("Failed", { billing: billing({ status: "PAST_DUE" }) }),
        location("Trial", { billing: billing({ status: "TRIAL" }) }),
        location("Fine"),
      ]),
    ).toBe(2);
  });
});

describe("teams", () => {
  const user = (id: string, name: string) => ({ id, name, email: `${id}@test.be`, avatarUrl: null });
  const teams = [
    {
      location: { id: "a", name: "Ixelles" },
      members: [
        { role: "EMPLOYEE", user: user("zoe", "Zoé") },
        { role: "OWNER", user: user("owner", "Sofie") },
      ],
      open: [
        { email: "new@test.be", state: "pending" },
        { email: "old@test.be", state: "expired" },
      ],
    },
    {
      location: { id: "b", name: "Uccle" },
      members: [
        { role: "ADMIN", user: user("zoe", "Zoé") },
        { role: "OWNER", user: user("owner", "Sofie") },
      ],
      open: [{ email: "new@test.be", state: "pending" }],
    },
  ];

  it("lists each person once with every place, the Owner first", () => {
    expect(teamPeople(teams).map(({ user: { name }, owner, places }) => [name, owner, places.length])).toEqual([
      ["Sofie", true, 2],
      ["Zoé", false, 2],
    ]);
    expect(teamPeople(teams)[1].places.map(({ role }) => role)).toEqual(["EMPLOYEE", "ADMIN"]);
  });

  it("gathers a pending invitation's Locations, and leaves an expired one out", () => {
    expect(teamInvitations(teams)).toEqual([
      {
        email: "new@test.be",
        places: [
          { id: "a", name: "Ixelles" },
          { id: "b", name: "Uccle" },
        ],
      },
    ]);
  });
});
