import { describe, expect, it } from "vitest";
import { lastPage, pageNumbers, parsePage } from "../src/lib/pagination";

describe("parsePage", () => {
  it("falls back to the first page, as the value comes from a URL", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(["2"])).toBe(1);
    expect(parsePage("999999999999")).toBe(100_000);
  });
});

describe("lastPage", () => {
  it("rounds up, and an empty list still has a first page", () => {
    expect(lastPage(0, 30)).toBe(1);
    expect(lastPage(30, 30)).toBe(1);
    expect(lastPage(31, 30)).toBe(2);
  });
});

describe("pageNumbers", () => {
  it("shows every page when there are few", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(2, 3)).toEqual([1, 2, 3]);
  });

  it("hides the far pages around the current one", () => {
    expect(pageNumbers(1, 12)).toEqual([1, 2, "gap", 12]);
    expect(pageNumbers(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
    expect(pageNumbers(12, 12)).toEqual([1, "gap", 11, 12]);
  });

  it("shows a lone hidden page instead of a gap", () => {
    expect(pageNumbers(3, 12)).toEqual([1, 2, 3, 4, "gap", 12]);
    expect(pageNumbers(4, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
