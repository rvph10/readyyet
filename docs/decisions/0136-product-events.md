# 0136: Four product events, after consent

Date: 2026-11-12

## Decision

Besides page views, the web app sends PostHog four named events, so the sign-up funnel shows where Owners stop before paying:

- `signed_up`: a new User saved their name, the step only a first sign-in has (ADR 0011), unless they came to accept an invitation.
- `business_created`: the create form succeeded, with the Business type's code.
- `ticket_created`: a Ticket was created. PostHog's funnels count the first one.
- `plan_chosen`: the return from Stripe Checkout, with the plan.

They are sent from the browser, through the same PostHog as page views, so everything in ADR 0132 holds: nothing before "Accept", nothing on Customers' pages, no `identify`. Events carry no name, email, or Ticket content, only the codes above. Without consent `track` returns before loading anything. The banner and `track` share one `loadPostHog`, so an event sent while the page loads waits for PostHog instead of being lost.

This extends ADR 0132, which allowed anonymous page views only. `createBusiness` no longer redirects from the server action, the form navigates after counting the step.

## Why

The user wants to optimise sign-up (user decision, 2026-11-12). Sending them from the API would reach PostHog without the visitor's consent and would need a different legal basis and a new section in the privacy notice; from the browser they stay under the consent already asked for.
