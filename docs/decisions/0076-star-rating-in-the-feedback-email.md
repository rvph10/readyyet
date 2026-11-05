# 0076: A star rating in the feedback email

Date: 2026-11-04

Replaces ADR 0027's "there's no rating step" and "no stars", and its rule that nothing about the Customer's answers decides which choices they see. Replaces these rules of ADR 0039: the tracking page offers both choices side by side, the email asks how it went and nothing else, its button opens the tracking page, and private feedback is sent from the tracking page. ADR 0039's other rules stay.

## Decision

- The email sent after `COMPLETED` shows five stars instead of a button. Each opens `/t/:code/review?stars=N` in the web app.
- Opening that page records nothing, and the stars aren't stored.
- **5 stars:** straight to the Location's Google review page, with no page in between. The email's own HTML holds no Google address, but this link is in effect a link to Google, so one tap goes from the email to the review page. A mail scanner opening it follows the same redirect, which records nothing.
- **4 stars:** a button to Google, with the private form one tap away under it.
- **1 to 3 stars:** the private feedback form, with a small link to Google at the bottom of the screen, without an underline, at the lightest colour that still passes ADR 0042's contrast rule. It stays a real, focusable link and is never removed.
- The tracking page no longer shows the two choices, only a link to this page, for a Customer without an email address. The page without `?stars=` asks for a rating first.

## Why

Stars ask for less effort than writing, so more Customers should answer. An unhappy Customer reaches the shop first, where the problem can still be fixed, and a delighted one reaches Google with no extra step.

A low rating keeps its link to Google, and it stays readable, so no Customer is prevented from leaving a public review.

## Known risks

This is a business decision taken knowing these risks, and it departs from what ADR 0027 chose to avoid them.

Sending Customers to Google according to their rating is what's known as review gating. Google's policy forbids merchants to "discourage or prohibit negative reviews, or selectively solicit positive reviews", and allows soliciting only without "attempting to influence the rating". Here 5 stars gets no other choice and a low rating gets a quiet link, so this can be read as a breach despite the link. It would be one rule applied by every Location on ReadyYet, the easiest pattern to detect, and the consequences would fall on Locations' Business Profiles.

Filtering which reviews get published may also count as a misleading commercial practice in Belgium and France, and an email with a rating that leads toward Google is closer to promotion than the plain question ADR 0039 settled on. This hasn't had legal review. It's needed before this email reaches real Customers, and nothing in the code holds the email back until then: it goes to every Pro Location with a Google review link as soon as it ships, so the review has to happen before it's promoted to `main`.
