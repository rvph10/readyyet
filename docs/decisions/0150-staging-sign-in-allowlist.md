# 0150: Only listed addresses sign in on staging

Date: 2026-11-13

## Decision

The API refuses to send a sign-in code to an address that isn't on `SIGN_IN_ALLOWLIST`, a comma-separated list of addresses and `@domain` entries, with the code `NOT_ALLOWED_TO_SIGN_IN`. The variable is set on staging only. Unset, as in production and locally, anyone signs in as before.

The list lives in Railway, not in the repository, so the addresses on it stay private.

## Why

Staging is reachable by anyone who finds its address and runs Stripe in test mode, where the public test card buys Pro. A stranger could run a real shop on it for free, sending real emails to their Customers from our domain, spending our Resend and Google Places quotas, and leaving personal data on an environment we don't treat as production.

Stopping staging between releases was considered. Every PR is checked there before promotion, so it would be on most of the time anyway, and open while it is. Sleeping services don't close it either: a visit wakes them, and the API's scheduled email jobs don't run while it sleeps.

## Consequences

Anyone who needs staging, a sales partner or an invited Employee included, is added to the list first. Users already on staging who aren't listed keep their current session until it ends, then can't sign in again. Google sign-in, once added, needs the same check.
