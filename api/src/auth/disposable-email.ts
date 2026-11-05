import { readFileSync } from "node:fs";
import { join } from "node:path";

// The community blocklist (CC0), refreshed with `pnpm disposable-domains`
// (ADR 0050). nest-cli.json copies it next to the compiled file.
const domains = new Set(readFileSync(join(__dirname, "disposable-domains.txt"), "utf8").split("\n").filter(Boolean));

// A subdomain of a listed domain is as disposable as the domain itself.
export function isDisposableEmail(email: string): boolean {
  const labels = email
    .slice(email.lastIndexOf("@") + 1)
    .toLowerCase()
    .split(".");
  return labels.some((_, index) => domains.has(labels.slice(index).join(".")));
}
