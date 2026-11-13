import Stripe from "stripe";

// Lazy for the same reason as getResendClient(): constructing it at import
// time would read STRIPE_SECRET_KEY before tests get to replace the client.
let client: Stripe | undefined;

export function getStripeClient(): Stripe {
  // Stripe's default is 80 s, held by an Owner waiting on checkout.
  // Pinned so a stripe-node major can't move the API version without a review of its changes.
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2026-10-28.endive",
    timeout: 20_000,
  });
  return client;
}
