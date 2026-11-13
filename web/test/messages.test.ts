import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(__dirname, "../messages");

function strings(value: unknown, path: string): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  return Object.entries(value as object).flatMap(([key, child]) => strings(child, path ? `${path}.${key}` : key));
}

// In ICU a lone ' before < or { opens a quoted span: "l'<dpa>" printed the
// tag and the rest of the sentence as raw text. '' writes the apostrophe.
describe("messages", () => {
  for (const file of readdirSync(dir)) {
    it(`${file} has no apostrophe that quotes a tag or argument`, () => {
      const all = strings(JSON.parse(readFileSync(join(dir, file), "utf8")), "");
      expect(all.filter(([, text]) => /(^|[^'])'[<{]/.test(text)).map(([path]) => path)).toEqual([]);
    });
  }
});
