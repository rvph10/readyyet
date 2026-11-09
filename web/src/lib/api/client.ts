import "server-only";
import { headers } from "next/headers";
import createClient from "openapi-fetch";
import { fetchWithRetry } from "./retry";
import type { paths } from "./schema";

// The API sees the visitor, not the web app's server: their session, and
// their address for its rate limits, which Railway's edge set on the request
// to us (ADR 0043).
const FORWARDED_HEADERS = ["cookie", "x-real-ip"];

export async function api() {
  const incoming = await headers();
  const forwarded = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = incoming.get(name);
    if (value) {
      forwarded.set(name, value);
    }
  }
  return createClient<paths>({ baseUrl: process.env.API_URL, headers: forwarded, fetch: fetchWithRetry });
}
