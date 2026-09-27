# 0050: No sign-in with a disposable email address

Date: 2026-09-27

## Decision

The API refuses to send a sign-in code to a disposable email address (yopmail.com, mailinator.com and the like), with a 400 and the code `DISPOSABLE_EMAIL`. The web app shows that the address can't be used and asks for a work or personal one.

- The check is a Better Auth `before` hook on `/email-otp/send-verification-otp`, so no code is sent and no User is created. Refusing sign-in also covers creating a Business and accepting an Invitation, which both need one.
- An address is disposable when its domain, or a domain it's a subdomain of, is on the community blocklist at github.com/disposable-email-domains/disposable-email-domains (CC0, about 9,000 domains).
- The list is a copy in `api/src/auth/disposable-domains.txt`, loaded once at startup. `pnpm disposable-domains` downloads the latest version, to review and commit like any other change.
- Customers' email addresses, typed by a Business on its Tickets, aren't checked. Which address a Customer gives is their choice, and refusing it would only slow the counter down.

## Why

A Business's first Location gets a 14-day Pro trial without a card (ADR 0031). With a throwaway address anyone could start a new trial every two weeks, and never pay.

It raises the cost of abuse, it doesn't make it impossible: an alias (`name+1@gmail.com`), a domain not listed yet, or many real addresses all still work. Requiring a card for the trial would, and stays the option if abuse shows up despite this.

A copy of the list, rather than the `disposable-email-domains` npm package or a paid checking service: the package hasn't been published since 2022 while the list is updated almost daily, and a service would put a third party and its latency in front of every sign-in. A copy committed to the repo also means a sign-in never depends on reaching GitHub.
