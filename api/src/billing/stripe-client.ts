import Stripe from "stripe";

// Lazy for the same reason as getResendClient(): constructing it at import
// time would read STRIPE_SECRET_KEY before tests get to replace the client.
let client: Stripe | undefined;

export function getStripeClient(): Stripe {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY as string);
  return client;
}
