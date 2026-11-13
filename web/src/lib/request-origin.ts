import "server-only";
import { headers } from "next/headers";

// The web app's own address, read from the request, as it has no setting for
// it. A proxy can list several protocols, the first is the browser's.
export async function requestOrigin() {
  const request = await headers();
  const proto = request.get("x-forwarded-proto")?.split(",")[0].trim() ?? "http";
  return `${proto}://${request.get("host")}`;
}
