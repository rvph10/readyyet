import type { IconName } from "@/components/ui/icon";

// What a Location's navigation offers. `managers` follows the API's own
// @LocationRoles: an Employee works Tickets and Customers (ADR 0017).
export const SECTIONS = [
  { slug: "", key: "tickets", icon: "inbox", managers: false },
  { slug: "customers", key: "customers", icon: "user", managers: false },
  { slug: "feedback", key: "feedback", icon: "message", managers: true },
  { slug: "team", key: "team", icon: "link", managers: true },
  { slug: "workflow", key: "workflow", icon: "filter", managers: true },
  { slug: "billing", key: "billing", icon: "date", managers: true },
  { slug: "settings", key: "settings", icon: "settings", managers: true },
] as const satisfies readonly { slug: string; key: string; icon: IconName; managers: boolean }[];

export type Section = (typeof SECTIONS)[number];

export function isManager(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export function findSection(slug: string, role: string) {
  return SECTIONS.find((section) => section.slug === slug && (!section.managers || isManager(role)));
}
