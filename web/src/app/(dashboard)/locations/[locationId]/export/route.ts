import { redirect } from "next/navigation";
import { api } from "@/lib/api/client";

// ADR 0129: the Owner's export, passed on as the API writes it, so the browser
// downloads it from the app's own origin with the session it already has.
export async function GET(_request: Request, { params }: RouteContext<"/locations/[locationId]/export">) {
  const { locationId } = await params;
  const client = await api();
  const { response } = await client.GET("/locations/{locationId}/export", {
    params: { path: { locationId } },
    parseAs: "stream",
  });
  if (!response.ok || !response.body) {
    // Read or not, an answer holds its connection to the API until dropped.
    await response.body?.cancel();
    redirect(`/locations/${locationId}/settings?section=export&failed=1`);
  }
  return new Response(response.body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": response.headers.get("content-disposition") ?? "attachment",
      "Cache-Control": "no-store",
    },
  });
}
