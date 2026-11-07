"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { actionResult, type ActionFailure } from "@/lib/api/errors";
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
): Promise<{ ok: true; id: string; title: string; customerName: string; trackingUrl: string } | ActionFailure> {
  const client = await api();
  const result = await client.POST("/locations/{locationId}/tickets", {
    params: { path: { locationId } },
    body: ticket,
  });
  if (!result.data) {
    return (await actionResult(result)) as ActionFailure;
  }
  revalidatePath(`/locations/${locationId}`, "layout");
  const { id, title, customer } = result.data;
  const { data } = await client.GET("/locations/{locationId}/tickets/{ticketId}", {
    params: { path: { locationId, ticketId: id } },
  });
  return { ok: true, id, title, customerName: customer.fullName, trackingUrl: data?.trackingUrl ?? "" };
}
