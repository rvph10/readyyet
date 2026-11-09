# 0124: Handing on the tracking link

Date: 2026-11-09

Changes the Ticket page's tracking tile (ADR 0090, 0108). `CopyField` itself stays as ADR 0090 describes it.

## Decision

The tracking link is never shown as text in the dashboard. The tile offers ways to hand it on instead:

- The QR code is always in the tile, small, and opens large on a click, with the Ticket's title, the Customer and the shop under it.
- That large view prints as a slip, alone on the page, for a Customer who has no email or would rather keep paper.
- The tracking code is shown in groups of four, so a Customer can read it out from the slip and staff find the Ticket by it, spaces or not. Copy gives it without the spaces.
- Copy link, WhatsApp, and SMS on touch screens, where `sms:` opens an app. WhatsApp and SMS need the Customer's phone, and open with a message ready to send.
- The message and the line under the large QR code are in the Customer's language, like their emails, as the Customer is the one reading them. The rest of the dashboard stays in the User's language.

## Why

A raw link is long, half of it cut off, and means nothing to staff or Customers. What staff actually need is to get it to the Customer standing at the counter or on the phone, so the tile holds those actions rather than the value.

Most of a shop's Customers in Belgium answer WhatsApp before email, and the shop already has their phone number on the Ticket.
