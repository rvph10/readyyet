import type { IconName } from "@/components/ui/icon";

export const SIDEBAR_COOKIE = "sidebar";

// What a Location's navigation offers. `managers` follows the API's own
// @LocationRoles: an Employee works Tickets and Customers (ADR 0017).
export const SECTIONS = [
  { slug: "", key: "today", icon: "dashboard", managers: false },
  { slug: "tickets", key: "tickets", icon: "tag", managers: false },
  { slug: "customers", key: "customers", icon: "user", managers: false },
  { slug: "feedback", key: "feedback", icon: "comment", managers: true },
  { slug: "team", key: "team", icon: "id-card", managers: true },
  { slug: "workflow", key: "workflow", icon: "layers", managers: true },
  { slug: "billing", key: "billing", icon: "receipt", managers: true },
  { slug: "settings", key: "settings", icon: "settings", managers: true },
] as const satisfies readonly { slug: string; key: string; icon: IconName; managers: boolean }[];

export type Section = (typeof SECTIONS)[number];

export function isManager(role: string) {
  return role === "OWNER" || role === "ADMIN";
}
