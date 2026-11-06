import { describe, expect, it } from "vitest";
import { groupByBusiness, matchesSearch, type Membership } from "../src/lib/memberships";

function membership(role: Membership["role"], businessName: string, locationName: string): Membership {
  return {
    role,
    location: {
      id: `${businessName}-${locationName}`,
      name: locationName,
      business: { id: businessName, name: businessName, logoUrl: null },
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
