# 0084: The tracking page links to the review page for every Customer

Date: 2026-11-05

Replaces ADR 0076's rule that the tracking page shows that link only to a Customer without an email address.

## Decision

The tracking page links to `/t/:code/review` whenever the Ticket offers a review and no private feedback was sent, whether or not the Customer has an email address.

## Why

Customers with a bounced address, who stopped updates, or who deleted the email never get the stars either, and ADR 0076's rule left them with no way to give feedback or review. The API doesn't tell the page whether a Customer has an address, and shouldn't, since the tracking page is public to anyone with the link.
