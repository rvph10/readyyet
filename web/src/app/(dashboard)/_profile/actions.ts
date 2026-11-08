"use server";

import type { SupportedLocale } from "@readyyet/shared";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { api } from "@/lib/api/client";
import { actionResult } from "@/lib/api/errors";
import { LOCALE_COOKIE } from "@/lib/locale";

const YEAR_SECONDS = 365 * 24 * 60 * 60;

// ADR 0118: one language for a User, their emails' and the app's, so the cookie
// ?lang= sets (ADR 0047) follows the saved one.
export async function setLanguage(locale: SupportedLocale) {
  const outcome = await actionResult(await (await api()).PATCH("/me", { body: { locale } }));
  if (!outcome.ok) return outcome;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: YEAR_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
  return outcome;
}

export async function setAvatar(image: FormData) {
  const result = await (
    await api()
  ).PUT("/me/avatar", {
    body: image as never,
    // Left to fetch, which sets the multipart boundary.
    bodySerializer: (body: unknown) => body as FormData,
  });
  revalidatePath("/", "layout");
  return actionResult(result);
}

export async function removeAvatar() {
  const result = await (await api()).DELETE("/me/avatar");
  revalidatePath("/", "layout");
  return actionResult(result);
}

// Unlike the Team page's, stays where it is: the profile lists every shop.
export async function leaveShop(locationId: string) {
  const result = await (
    await api()
  ).DELETE("/locations/{locationId}/memberships/me", { params: { path: { locationId } } });
  revalidatePath("/", "layout");
  return actionResult(result);
}

export async function deleteAccount() {
  return actionResult(await (await api()).DELETE("/me"));
}
