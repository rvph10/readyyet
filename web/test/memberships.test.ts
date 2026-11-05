import { describe, expect, it } from "vitest";
import { groupByBusiness, ownedBusiness, type Membership } from "../src/lib/memberships";

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

describe("ownedBusiness", () => {
  const memberships = [membership("OWNER", "Atelier", "Ixelles"), membership("ADMIN", "Zed", "Namur")];

  it("finds a Business the User owns", () => {
    expect(ownedBusiness(memberships, "Atelier")?.name).toBe("Atelier");
  });

  it("refuses an Admin, even of one of its Locations, and a stranger", () => {
    expect(ownedBusiness(memberships, "Zed")).toBeUndefined();
    expect(ownedBusiness(memberships, "Other")).toBeUndefined();
  });
});
