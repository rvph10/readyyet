import { describe, expect, it } from "vitest";
import { canManage, openInvitations, placesTaken } from "../src/app/(dashboard)/locations/[locationId]/team/team-views";

const now = new Date("2026-11-06T12:00:00Z");
const invitation = (email: string, status: string, expiresAt = "2026-11-10T12:00:00Z") =>
  ({ id: `${email}-${status}`, email, status, expiresAt }) as Parameters<typeof openInvitations>[0][number];

describe("canManage", () => {
  it("follows ADR 0017", () => {
    expect(canManage("OWNER", "ADMIN")).toBe(true);
    expect(canManage("OWNER", "EMPLOYEE")).toBe(true);
    expect(canManage("ADMIN", "EMPLOYEE")).toBe(true);
    expect(canManage("ADMIN", "ADMIN")).toBe(false);
    expect(canManage("OWNER", "OWNER")).toBe(false);
    expect(canManage("ADMIN", "OWNER")).toBe(false);
    expect(canManage("EMPLOYEE", "EMPLOYEE")).toBe(false);
  });
});

describe("openInvitations", () => {
  it("names the state, a pending one past its date being expired", () => {
    const states = openInvitations(
      [
        invitation("a@x.be", "PENDING"),
        invitation("b@x.be", "PENDING", "2026-11-01T12:00:00Z"),
        invitation("c@x.be", "EXPIRED"),
        invitation("d@x.be", "DECLINED"),
      ],
      [],
      now,
    ).map(({ state }) => state);
    expect(states).toEqual(["pending", "expired", "expired", "declined"]);
  });

  it("leaves out what's over", () => {
    expect(openInvitations([invitation("a@x.be", "REVOKED"), invitation("b@x.be", "ACCEPTED")], [], now)).toEqual([]);
  });

  it("keeps only the newest for an address, whatever its case", () => {
    const shown = openInvitations([invitation("A@x.be", "PENDING"), invitation("a@x.be", "EXPIRED")], [], now);
    expect(shown.map(({ status }) => status)).toEqual(["PENDING"]);
    expect(openInvitations([invitation("a@x.be", "REVOKED"), invitation("a@x.be", "EXPIRED")], [], now)).toEqual([]);
  });

  it("forgets someone who has joined", () => {
    expect(openInvitations([invitation("a@x.be", "DECLINED")], ["A@x.be"], now)).toEqual([]);
  });
});

describe("placesTaken", () => {
  it("counts pending invitations only", () => {
    expect(placesTaken(2, [{ state: "pending" }, { state: "expired" }, { state: "declined" }])).toBe(3);
  });
});
