"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import { customersHref } from "./customer-views";

const customerPath = (locationId: string, customerId: string) => ({ params: { path: { locationId, customerId } } });

type Changes = Omit<components["schemas"]["UpdateCustomerDto"], "email" | "phone"> & {
  email?: string | null;
  phone?: string | null;
};

export async function updateCustomer(locationId: string, customerId: string, changes: Changes) {
  const result = await (
    await api()
  ).PATCH("/locations/{locationId}/customers/{customerId}", {
    ...customerPath(locationId, customerId),
    // The API clears an address on null, which its generated type doesn't say.
    body: changes as components["schemas"]["UpdateCustomerDto"],
  });
  revalidatePath(`/locations/${locationId}`, "layout");
  return actionResult(result);
}

// Redirects from here: refreshing the page they're on would be a 404 by then.
export async function eraseCustomer(locationId: string, customerId: string) {
  const result = await (
    await api()
  ).DELETE("/locations/{locationId}/customers/{customerId}", customerPath(locationId, customerId));
  const outcome = await actionResult(result);
  if (!outcome.ok) return outcome;
  revalidatePath(`/locations/${locationId}`, "layout");
  redirect(`${customersHref(locationId)}?erased=1`);
}
