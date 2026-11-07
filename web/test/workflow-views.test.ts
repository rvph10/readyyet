import { describe, expect, it } from "vitest";
import {
  addableSteps,
  chosenCodes,
  moveStep,
  sameSteps,
} from "../src/app/(dashboard)/locations/[locationId]/workflow/workflow-views";

const status = (code: string, label = code, isSystem = false) => ({
  code,
  isSystem,
  translations: [{ locale: "EN" as "EN" | "FR", label }],
});

describe("chosenCodes", () => {
  it("leaves out what the API places itself (ADR 0035)", () => {
    const steps = ["RECEIVED", "DIAGNOSING", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED", "REJECTED"];
    expect(chosenCodes(steps.map((code) => ({ status: { code } })))).toEqual(["DIAGNOSING", "IN_PROGRESS"]);
  });
});

describe("moveStep", () => {
  it("moves a step up and down", () => {
    expect(moveStep(["A", "B", "C"], "C", 0)).toEqual(["C", "A", "B"]);
    expect(moveStep(["A", "B", "C"], "A", 1)).toEqual(["B", "A", "C"]);
  });

  it("stays inside the list", () => {
    expect(moveStep(["A", "B"], "A", -1)).toEqual(["A", "B"]);
    expect(moveStep(["A", "B"], "A", 9)).toEqual(["B", "A"]);
  });
});

describe("sameSteps", () => {
  it("minds the order", () => {
    expect(sameSteps(["A", "B"], ["A", "B"])).toBe(true);
    expect(sameSteps(["A", "B"], ["B", "A"])).toBe(false);
    expect(sameSteps(["A"], ["A", "B"])).toBe(false);
  });
});

describe("addableSteps", () => {
  const statuses = [
    status("RECEIVED", "Received", true),
    status("DIAGNOSING", "Diagnosing"),
    status("IN_PROGRESS", "In progress"),
    status("AWAITING_PARTS", "Attente pièces"),
  ];

  const labelOf = ({ translations }: (typeof statuses)[number]) => translations[0].label;
  const toneOf = (code: string) =>
    ({ DIAGNOSING: "received", IN_PROGRESS: "working", AWAITING_PARTS: "waiting" })[code] ?? "other";
  const find = (chosen: string[], query: string) => addableSteps(statuses, chosen, query, labelOf, toneOf);

  it("groups by kind, without system Statuses or chosen steps", () => {
    const groups = find(["IN_PROGRESS"], "");
    expect(groups.map(({ group }) => group)).toEqual(["received", "waiting"]);
    expect(groups[0].statuses.map(({ code }) => code)).toEqual(["DIAGNOSING"]);
  });

  it("finds a step whatever its accents and case", () => {
    expect(find([], "PIECES")[0].statuses[0].code).toBe("AWAITING_PARTS");
    expect(find([], "nothing like it")).toEqual([]);
  });
});
