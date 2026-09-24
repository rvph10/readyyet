# 0027: Customer reviews

Date: 2026-09-24

Extends ADR 0015, which sends no email on `COMPLETED`.

## Decision

A paid feature, like custom Workflows (ADR 0003). A Location on the free plan or trial has none of it.

### What the Customer sees

A Location sets its Google review link (Google's "write a review" URL for its Business Profile). Once it has one, when a Ticket reaches `COMPLETED`:

- the Customer gets a thank-you email, queued and delayed like a Status update email (ADR 0015), so an undone `COMPLETED` sends nothing,
- that email and the tracking page of the completed Ticket both offer the same two choices, side by side, to every Customer: leave a review on Google, or tell the shop privately that something went wrong.

There's no rating step and nothing about the Customer, the Ticket or their answers decides which choices they see. The Google link is always shown.

The email follows ADR 0015's rules: none for a Customer without an email address, a bounced or complained address, a Ticket whose updates were stopped, or a deleted Location. A Ticket gets at most one, a reopened Ticket completed again sends no second one.

### Private feedback

The feedback form is free text only, no stars, sent from the tracking page while its link is valid, once per Ticket. It's stored against the Ticket and listed per Location in the dashboard for Owners and Admins, newest first, and marked as handled by whoever deals with it. Feedback is kept as long as the Ticket, and is erased with the Customer's other personal data.

## Why

Google's policy forbids selectively soliciting positive reviews, and since April 2026 also staff review quotas and asking for specific content. Enforcement is automated and ends in removed reviews or a suspended Business Profile. Gating would be one rule applied the same way by every Location on ReadyYet, the easiest possible pattern to detect, and French law treats review manipulation as a misleading commercial practice. So the gain comes from what's allowed: asking every Customer, at the moment they've just got their item back, with a one-tap link. Most Customers are satisfied and most never think to review, asking all of them raises both the count and the average.

The private option is shown to everyone for the same reason. An unhappy Customer who has a direct line to the shop often takes it, because it can fix their problem and a public review can't. No star rating in the form, because a rating next to the Google link is the first step toward gating it on the score.

The thank-you email is a new kind of customer email. Whether it needs the Customer's prior consent under French rules on commercial email hasn't been checked, and must be before it ships. If it does, the tracking page alone carries the ask.

It's paid because it's the feature that brings a shop new customers, the clearest reason to upgrade after getting tracking for free.
