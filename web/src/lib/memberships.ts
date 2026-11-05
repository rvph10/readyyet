import type { components } from "./api/schema";

export type Membership = components["schemas"]["MyMembershipDto"];
export type MyBusiness = Membership["location"]["business"];

// Access is per Location (ADR 0002), and a User can work at unrelated
// Businesses, so a Business here is only a heading over its Locations.
export function groupByBusiness(memberships: Membership[]) {
  const groups = new Map<string, { business: MyBusiness; memberships: Membership[] }>();
  for (const membership of memberships) {
    const { business } = membership.location;
    const group = groups.get(business.id) ?? { business, memberships: [] };
    group.memberships.push(membership);
    groups.set(business.id, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.business.name.localeCompare(b.business.name))
    .map((group) => ({
      ...group,
      memberships: group.memberships.sort((a, b) => a.location.name.localeCompare(b.location.name)),
      // The Owner has an OWNER Membership on every Location of the Business.
      owned: group.memberships.some((membership) => membership.role === "OWNER"),
    }));
}
