import { describe, expect, it } from "vitest";
import { newCustomerSchema, ticketSchema } from "../src/app/(dashboard)/locations/[locationId]/tickets/new/schema";

const t = (key: string) => key;
const TODAY = "2026-11-05";
const ticket = (values: object) =>
  ticketSchema(t, TODAY).safeParse({ title: "Boots", description: "", estimatedReadyDate: "", ...values });
const customer = (values: object) =>
  newCustomerSchema(t).safeParse({ customer: { fullName: "Léa", email: "", phone: "", ...values } });

describe("ticketSchema", () => {
  it("sends null for an empty date, so the API doesn't fill in the turnaround date", () => {
    expect(ticket({}).data).toEqual({ title: "Boots", description: undefined, estimatedReadyDate: null });
  });

  it("takes today and later, not the past", () => {
    expect(ticket({ estimatedReadyDate: TODAY }).success).toBe(true);
    expect(ticket({ estimatedReadyDate: "2026-11-04" }).error?.issues[0].message).toBe("datePast");
  });

  it("wants a title that isn't only spaces, within the API's limit", () => {
    expect(ticket({ title: "   " }).error?.issues[0].message).toBe("titleMissing");
    expect(ticket({ title: "x".repeat(201) }).error?.issues[0].message).toBe("titleTooLong");
  });
});

describe("newCustomerSchema", () => {
  it("leaves out an empty email and phone", () => {
    expect(customer({}).data?.customer).toEqual({ fullName: "Léa", email: undefined, phone: undefined });
  });

  it("refuses what the API would", () => {
    expect(customer({ fullName: " " }).error?.issues[0].message).toBe("nameMissing");
    expect(customer({ email: "a@b" }).error?.issues[0].message).toBe("emailInvalid");
    expect(customer({ phone: "+32123" }).error?.issues[0].message).toBe("phoneInvalid");
  });

  it("takes a real email and an international phone number", () => {
    expect(customer({ email: " lea@example.be ", phone: "+32470123456" }).data?.customer).toMatchObject({
      email: "lea@example.be",
      phone: "+32470123456",
    });
  });
});
