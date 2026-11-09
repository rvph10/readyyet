import { describe, expect, it } from "vitest";
import { parseSort } from "../src/lib/sort";
import { ticketsHref } from "../src/app/(dashboard)/locations/[locationId]/tickets/ticket-views";

describe("parseSort", () => {
  const columns = ["name", "since"] as const;

  it("reads a known column, ascending unless told otherwise", () => {
    expect(parseSort({ sort: "since", dir: "desc" }, columns)).toEqual({ column: "since", dir: "desc" });
    expect(parseSort({ sort: "name", dir: "sideways" }, columns)).toEqual({ column: "name", dir: "asc" });
  });

  it("ignores anything else in the URL", () => {
    expect(parseSort({ sort: "password" }, columns)).toBeNull();
    expect(parseSort({ sort: ["name", "since"] }, columns)).toBeNull();
    expect(parseSort({}, columns)).toBeNull();
  });
});

describe("ticketsHref", () => {
  it("keeps the sort beside the view and the page", () => {
    expect(ticketsHref("l", { view: "late", page: 2, sort: { column: "title", dir: "desc" } })).toBe(
      "/locations/l/tickets?view=late&sort=title&dir=desc&page=2",
    );
  });
});
