"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";

function refreshed() {
  revalidatePath("/admin", "layout");
}

export async function markSalesPartner(email: string) {
  const result = await (await api()).POST("/admin/sales-partners", { body: { email } });
  refreshed();
  return actionResult(result);
}

export async function removeSalesPartner(userId: string) {
  const result = await (await api()).DELETE("/admin/sales-partners/{userId}", { params: { path: { userId } } });
  refreshed();
  return actionResult(result);
}

// The ids on screen, never "all owed": one that became owed since the page
// loaded wasn't part of the transfer (ADR 0040).
export async function markCommissionsPaid(commissionIds: string[]) {
  const result = await (await api()).POST("/admin/commissions/mark-paid", { body: { commissionIds } });
  refreshed();
  return actionResult(result);
}
