export const COMMISSION_VIEWS = ["OWED", "PENDING", "PAID", "VOIDED"] as const;
export type CommissionView = (typeof COMMISSION_VIEWS)[number];

export function parseCommissionView(value: unknown): CommissionView {
  return COMMISSION_VIEWS.find((view) => view === value) ?? "OWED";
}

export function partnerHref(userId: string, query: { view?: CommissionView; page?: number } = {}) {
  const search = new URLSearchParams();
  if (query.view && query.view !== "OWED") search.set("view", query.view);
  if (query.page && query.page > 1) search.set("page", String(query.page));
  const suffix = search.size > 0 ? `?${search}` : "";
  return `/admin/sales-partners/${userId}${suffix}`;
}
