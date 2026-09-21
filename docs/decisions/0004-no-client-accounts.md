# 0004: Clients have no account, tickets are reached by unguessable link or QR code

Date: 2026-09-21

## Decision

A client never creates an account or logs in. Each ticket is reachable only via an unguessable, unique code at `readyyet.app/t/[code]`. Clients with an email receive this link by email. Clients without an email are shown a QR code generated on the shop's own device at drop-off, readyyet does not integrate with printers or send SMS.

## Why

A client only ever cares about tracking one job at a time, an account would add real auth surface (signup, password reset, session management) for no benefit to the actual use case. This mirrors well-established patterns in parcel tracking and similar drop-off/pickup services. The trade-off is accepted deliberately: a client has no history across visits, each job gets a fresh link.
