export function customersHref(locationId: string, { q, page }: { q?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/locations/${locationId}/customers${query ? `?${query}` : ""}`;
}

// Resend reported this address: no more email goes to it until it's changed.
export function emailFails(customer: { emailBouncedAt: string | null; emailComplainedAt: string | null }) {
  return Boolean(customer.emailBouncedAt || customer.emailComplainedAt);
}
