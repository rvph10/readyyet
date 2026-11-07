"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";
import { actionResult, type ActionFailure, type ActionResult } from "@/lib/api/errors";
import type { Interval, Plan } from "../plan-prices";

// The sidebar's trial card and counts read the plan too.
async function done(locationId: string, result: Parameters<typeof actionResult>[0]) {
  revalidatePath(`/locations/${locationId}`, "layout");
  return actionResult(result);
}

// The current plan undoes a waiting move or a cancellation (ADR 0033).
export async function changePlan(locationId: string, plan: Plan, interval: Interval): Promise<ActionResult> {
  const client = await api();
  return done(
    locationId,
    await client.POST("/locations/{locationId}/billing/plan", {
      params: { path: { locationId } },
      body: { plan, interval },
    }),
  );
}

export async function stopPaying(locationId: string): Promise<ActionResult> {
  const client = await api();
  return done(
    locationId,
    await client.POST("/locations/{locationId}/billing/cancel", { params: { path: { locationId } } }),
  );
}

export async function previewPromotionCode(
  locationId: string,
  code: string,
): Promise<{ ok: true; now: number; withCode: number } | ActionFailure> {
  const result = await (
    await api()
  ).GET("/locations/{locationId}/billing/promotion-codes/{code}", {
    params: { path: { locationId, code } },
  });
  if (result.data) {
    return { ok: true, now: result.data.nextInvoiceAmount, withCode: result.data.nextInvoiceAmountWithCode };
  }
  return (await actionResult(result)) as ActionFailure;
}

export async function applyPromotionCode(locationId: string, promotionCode: string): Promise<ActionResult> {
  const client = await api();
  return done(
    locationId,
    await client.POST("/locations/{locationId}/billing/promotion-code", {
      params: { path: { locationId } },
      body: { promotionCode },
    }),
  );
}

export async function openPortal(businessId: string): Promise<ActionResult> {
  const result = await (
    await api()
  ).POST("/businesses/{businessId}/billing/portal", { params: { path: { businessId } } });
  if (result.data) {
    redirect(result.data.url);
  }
  return actionResult(result);
}
