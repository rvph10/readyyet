import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldErrors } from "../src/lib/validation";

const schema = z.object({
  name: z.string().min(1, "Enter a name.").max(3, "Too long."),
  location: z.object({ contactEmail: z.email("Enter an email.") }),
});

describe("fieldErrors", () => {
  it("names each field by its path, as the API does", () => {
    const result = schema.safeParse({ name: "", location: { contactEmail: "paul@gmail" } });
    expect(fieldErrors(result.error!)).toEqual({
      name: "Enter a name.",
      "location.contactEmail": "Enter an email.",
    });
  });

  it("keeps a field's first issue", () => {
    const result = z
      .object({ name: z.string().min(5, "Too short.").regex(/^\d+$/, "Digits only.") })
      .safeParse({ name: "ab" });
    expect(fieldErrors(result.error!)).toEqual({ name: "Too short." });
  });
});
