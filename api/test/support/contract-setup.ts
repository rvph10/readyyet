import { afterEach, expect } from "vitest";
import { contractViolations } from "./openapi-contract";

afterEach(() => {
  expect(contractViolations.splice(0), "responses that don't match api/openapi.json").toEqual([]);
});
