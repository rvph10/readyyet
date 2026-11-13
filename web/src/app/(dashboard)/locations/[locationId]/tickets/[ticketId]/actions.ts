"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";

// The whole Location: its navigation counts Tickets too.
function refreshed(locationId: string) {
  revalidatePath(`/locations/${locationId}`, "layout");
}

const ticketPath = (locationId: string, ticketId: string) => ({ params: { path: { locationId, ticketId } } });

export async function changeStatus(locationId: string, ticketId: string, statusCode: string) {
  const result = await (
    await api()
  ).PATCH("/locations/{locationId}/tickets/{ticketId}/status", {
    ...ticketPath(locationId, ticketId),
    body: { statusCode },
  });
  refreshed(locationId);
  return actionResult(result);
}

export async function undoStatus(locationId: string, ticketId: string) {
  const result = await (
    await api()
  ).POST("/locations/{locationId}/tickets/{ticketId}/status/undo", ticketPath(locationId, ticketId));
  refreshed(locationId);
  return actionResult(result);
}

export async function dismissCollected(locationId: string, ticketId: string) {
  const result = await (
    await api()
  ).POST("/locations/{locationId}/tickets/{ticketId}/customer-collected/dismiss", ticketPath(locationId, ticketId));
  refreshed(locationId);
  return actionResult(result);
}

export async function resendLink(locationId: string, ticketId: string) {
  return actionResult(
    await (
      await api()
    ).POST("/locations/{locationId}/tickets/{ticketId}/resend-link", ticketPath(locationId, ticketId)),
  );
}

export async function updateTicket(
  locationId: string,
  ticketId: string,
  ticket: components["schemas"]["UpdateTicketDto"],
) {
  const result = await (
    await api()
  ).PATCH("/locations/{locationId}/tickets/{ticketId}", { ...ticketPath(locationId, ticketId), body: ticket });
  refreshed(locationId);
  return actionResult(result);
}

export async function addPhoto(locationId: string, ticketId: string, photo: FormData) {
  const result = await (
    await api()
  ).POST("/locations/{locationId}/tickets/{ticketId}/photos", {
    ...ticketPath(locationId, ticketId),
    body: photo as never,
    // Left to fetch, which sets the multipart boundary.
    bodySerializer: (body) => body as unknown as FormData,
  });
  refreshed(locationId);
  return actionResult(result);
}

export async function deletePhoto(locationId: string, ticketId: string, photoId: string) {
  const result = await (
    await api()
  ).DELETE("/locations/{locationId}/tickets/{ticketId}/photos/{photoId}", {
    params: { path: { locationId, ticketId, photoId } },
  });
  refreshed(locationId);
  return actionResult(result);
}

// Redirects from here: refreshing the page they're on would be a 404 by then.
export async function deleteTicket(locationId: string, ticketId: string) {
  const result = await (
    await api()
  ).DELETE("/locations/{locationId}/tickets/{ticketId}", ticketPath(locationId, ticketId));
  const outcome = await actionResult(result);
  if (!outcome.ok) return outcome;
  refreshed(locationId);
  redirect(`/locations/${locationId}/tickets?deleted=1`);
}
