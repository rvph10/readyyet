import "server-only";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { cache } from "react";
import { api } from "./api/client";
import { pageData } from "./api/errors";

// Read by the dashboard layout and its pages, called once per request.
export const getMe = cache(async () => pageData(await (await api()).GET("/me")));

// For pages a visitor may open signed out, like an invitation's: the User,
// or null without a session. A cookie whose session has ended is a visitor
// like any other.
export const getOptionalMe = cache(async () => {
  if (!getSessionCookie(await headers())) {
    return null;
  }
  const result = await (await api()).GET("/me");
  return result.response.status === 401 ? null : pageData(result);
});
