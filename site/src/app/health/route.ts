// Railway's deploy healthcheck, and the promotion job waits here for staging
// to run the commit being promoted (ADR 0023), like the API's /health.
export function GET() {
  return new Response("ok", {
    headers: { "x-release": process.env.RAILWAY_GIT_COMMIT_SHA ?? "unknown" },
  });
}
