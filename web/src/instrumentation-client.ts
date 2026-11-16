import { sentryOptions } from "./lib/sentry";

// Imported, not bundled with the page: this file runs before the page is
// hydrated, and the SDK is a quarter of its JavaScript. An error thrown in
// the moment before it arrives isn't reported.
const sentry = import("@sentry/nextjs").then((Sentry) => {
  Sentry.init(sentryOptions);
  return Sentry;
});

export function onRouterTransitionStart(href: string, navigationType: string) {
  void sentry.then((Sentry) => Sentry.captureRouterTransitionStart(href, navigationType));
}
