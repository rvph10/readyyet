import type { BrowserOptions, NodeOptions } from "@sentry/nextjs";

// A tracking code gives access to a Ticket (ADR 0004), in the web app's own
// URLs (/t/:code) and in the API's it calls (/tracking/:code). A query string
// can carry a search term, usually a Customer's name.
export function redactUrl(url: string): string {
  return url.split("?")[0].replace(/\/(t|tracking)\/[^/#\s]+/, "/$1/[redacted]");
}

// Shared by the server (instrumentation.ts) and the browser
// (instrumentation-client.ts). Without a DSN (locally, in CI) nothing is sent.
export const sentryOptions: BrowserOptions & NodeOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  // The API's project too (ADR 0045), told apart by this tag.
  initialScope: { tags: { service: "web" } },
  // Like the API's: only the method and path of a request, no body, cookies
  // or user.
  beforeSend(event) {
    if (event.request) {
      const { method, url } = event.request;
      event.request = { method, url: url && redactUrl(url) };
    }
    if (event.transaction) {
      event.transaction = redactUrl(event.transaction);
    }
    // Added by onRequestError, the path as requested, query string included.
    const nextjs = event.contexts?.nextjs;
    if (typeof nextjs?.request_path === "string") {
      nextjs.request_path = redactUrl(nextjs.request_path);
    }
    delete event.user;
    return event;
  },
  // Navigation and fetch breadcrumbs record every URL the visitor went
  // through before the error.
  beforeBreadcrumb(breadcrumb) {
    const data = breadcrumb.data;
    if (data) {
      for (const key of ["url", "from", "to"]) {
        if (typeof data[key] === "string") {
          data[key] = redactUrl(data[key]);
        }
      }
    }
    return breadcrumb;
  },
};
