import { describe, expect, it } from "vitest";
import { statusChoices } from "../src/app/(dashboard)/locations/[locationId]/tickets/[ticketId]/status-choices";

const codes = ["RECEIVED", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED", "REJECTED"];
const steps = codes.map((code, position) => ({
  position,
  status: { id: position, code, translations: [] },
}));
const names = (choices: ReturnType<typeof statusChoices>) => ({
  next: choices.next?.code ?? null,
  others: choices.others.map((status) => status.code),
});

describe("statusChoices", () => {
  it("suggests the next step, and never offers RECEIVED or COMPLETED before READY", () => {
    expect(names(statusChoices(steps, "RECEIVED", "EMPLOYEE"))).toEqual({
      next: "IN_PROGRESS",
      others: ["READY", "CANCELLED", "REJECTED"],
    });
  });

  it("lets a READY Ticket move back, and be completed", () => {
    expect(names(statusChoices(steps, "READY", "EMPLOYEE"))).toEqual({
      next: "COMPLETED",
      others: ["IN_PROGRESS", "CANCELLED", "REJECTED"],
    });
  });

  it("offers an Employee nothing on an ended Ticket", () => {
    expect(names(statusChoices(steps, "COMPLETED", "EMPLOYEE"))).toEqual({ next: null, others: [] });
  });

  it("lets an Owner or Admin reopen an ended Ticket, with no suggested step", () => {
    expect(names(statusChoices(steps, "COMPLETED", "ADMIN"))).toEqual({
      next: null,
      others: ["IN_PROGRESS", "READY", "CANCELLED", "REJECTED"],
    });
  });
});
