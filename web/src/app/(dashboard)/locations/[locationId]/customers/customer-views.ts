import { setSort, type Sort } from "../../../../../lib/sort";

export const CUSTOMER_SORTS = ["name", "email", "phone", "since"] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export function customersHref(
  locationId: string,
  { q, page, sort }: { q?: string; page?: number; sort?: Sort<CustomerSort> | null } = {},
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  setSort(params, sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/locations/${locationId}/customers${query ? `?${query}` : ""}`;
}

// Resend reported this address: no more email goes to it until it's changed.
export function emailFails(customer: { emailBouncedAt: string | null; emailComplainedAt: string | null }) {
  return Boolean(customer.emailBouncedAt || customer.emailComplainedAt);
}
