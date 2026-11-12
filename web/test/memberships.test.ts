import { describe, expect, it } from "vitest";
import { groupByBusiness, matchesSearch, type Membership, businessHref, chooseBusiness } from "../src/lib/memberships";

function membership(role: Membership["role"], businessName: string, locationName: string): Membership {
  return {
    role,
    location: {
      id: `${businessName}-${locationName}`,
      name: locationName,
      business: { id: businessName, name: businessName, logoUrl: null, termsAccepted: true },
    },
  };
}

describe("groupByBusiness", () => {
  const groups = groupByBusiness([
    membership("EMPLOYEE", "Zed", "Namur"),
    membership("OWNER", "Atelier", "Uccle"),
    membership("OWNER", "Atelier", "Ixelles"),
  ]);

  it("sorts the Businesses and each one's Locations by name", () => {
    expect(groups.map((group) => group.business.name)).toEqual(["Atelier", "Zed"]);
    expect(groups[0].memberships.map(({ location }) => location.name)).toEqual(["Ixelles", "Uccle"]);
  });

  it("says which Businesses the User owns", () => {
    expect(groups.map((group) => group.owned)).toEqual([true, false]);
  });
});

describe("matchesSearch", () => {
  const liege = membership("EMPLOYEE", "Garage Martin", "Liège");

  it("finds a Location by its name or its Business's, whatever the accents and case", () => {
    expect(matchesSearch(liege, "liege")).toBe(true);
    expect(matchesSearch(liege, " MARTIN ")).toBe(true);
    expect(matchesSearch(liege, "garage liege")).toBe(false);
    expect(matchesSearch(liege, "namur")).toBe(false);
  });
});

const inBusiness = (businessId: string, locationId: string, role: string) =>
  ({
    role,
    location: { id: locationId, name: locationId, business: { id: businessId, name: businessId, logoUrl: null } },
  }) as Membership;

const groups = groupByBusiness([
  inBusiness("A staff", "a1", "EMPLOYEE"),
  inBusiness("B owned", "b1", "OWNER"),
  inBusiness("C staff", "c1", "EMPLOYEE"),
  inBusiness("C staff", "c2", "ADMIN"),
]);
const [staff, owned, severalLocations] = groups;

describe("chooseBusiness", () => {
  it("follows the URL", () => {
    expect(chooseBusiness(groups, "C staff")).toBe(severalLocations);
  });

  it("falls back on a Business they own, for no choice or one that isn't theirs", () => {
    expect(chooseBusiness(groups, null)).toBe(owned);
    expect(chooseBusiness(groups, "someone else's")).toBe(owned);
  });

  it("takes the first when they own none", () => {
    expect(chooseBusiness([staff, severalLocations], null)).toBe(staff);
  });

  it("has nothing to choose without a Membership", () => {
    expect(chooseBusiness([], null)).toBeUndefined();
  });
});

describe("businessHref", () => {
  it("leads an Owner to the Business's pages", () => {
    expect(businessHref(owned)).toBe("/businesses/B owned");
  });

  it("goes straight to a lone Location, and to the picker with several", () => {
    expect(businessHref(staff)).toBe("/locations/a1");
    expect(businessHref(severalLocations)).toBe("/?business=C staff");
  });
});
