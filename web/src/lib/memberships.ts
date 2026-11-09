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

type BusinessGroup = ReturnType<typeof groupByBusiness>[number];

// ADR 0104: one Business at a time, the one in the URL, else one they own, as
// that's the one they came to manage.
export function chooseBusiness(groups: BusinessGroup[], businessId: string | null): BusinessGroup | undefined {
  return groups.find(({ business }) => business.id === businessId) ?? groups.find(({ owned }) => owned) ?? groups[0];
}

// Where moving to a Business leads. Only its Owner has pages for it, and a
// single Location leaves nothing to choose.
export function businessHref({ business, memberships, owned }: BusinessGroup) {
  if (owned) return `/businesses/${business.id}`;
  return memberships.length === 1 ? `/locations/${memberships[0].location.id}` : `/?business=${business.id}`;
}

// So "liege" finds Liège: nobody types the accents in a search box.
function fold(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function matchesName(name: string, query: string) {
  return fold(name).includes(fold(query.trim()));
}

export function matchesSearch({ location }: Membership, query: string) {
  return fold(`${location.business.name} ${location.name}`).includes(fold(query.trim()));
}
