"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult, type ActionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

const MATCHES = 5;

// Only a help for finding someone: without an answer, the form still creates a
// new Customer.
export async function findCustomers(locationId: string, q: string) {
  const { data } = await (
    await api()
  ).GET("/locations/{locationId}/customers", {
    params: { path: { locationId }, query: { q, take: MATCHES } },
  });
  return data?.items ?? [];
}

export async function createTicket(
  locationId: string,
  ticket: components["schemas"]["CreateTicketDto"],
): Promise<ActionResult> {
  const result = await (
    await api()
  ).POST("/locations/{locationId}/tickets", {
    params: { path: { locationId } },
    body: ticket,
  });
  if (result.data) {
    revalidatePath(`/locations/${locationId}`);
    redirect(`/locations/${locationId}`);
  }
  return actionResult(result);
}
