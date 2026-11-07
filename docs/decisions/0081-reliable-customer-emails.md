# 0081: An email is saved with what it's about, and retried for a day

Date: 2026-11-05

Changes ADR 0010's retries, and ADR 0015's "the ticket-created email is sent immediately".

## Decision

**The ticket-created email is due in the Ticket's own transaction.** Creating a Ticket sets `trackingEmailDueAt`. A sweep every 5 seconds claims what's due with a lease, as the status emails do, sends it, and clears the field. The request no longer sends anything. The email has a `dedupeKey`, so a retry after a crash finds the first email rather than making a second. A Ticket over a day old no longer sends it.

**A failing email is retried for 24 hours,** not about 10 minutes. Each round is up to 3 attempts. Rounds wait 1 minute, doubling to at most 2 hours, on a sweep that runs every 5 minutes, and past the 24 hours it gets one last round. Sign-in codes stay out of this (ADR 0021).

**Every retry checks the email is still wanted.** `EmailLog` knows its Ticket. An email isn't retried once the Customer's address has changed, or they're erased or flagged, or the Location is deleted, or updates were stopped, except the tracking link, which staff may ask for anyway. A Status email isn't retried once the Ticket has moved on. These are marked given up, with no alert.

**An email given up on after failing is marked and reported.** `gaveUpAt` is set after the last round, or when Resend took the email and later reported it failed, since sending it again with its idempotency key would only replay Resend's first answer. A refusal Resend won't take back, like an invalid API key, is reported at once and still retried, as it's often our own setup and can be fixed. Reports go to Sentry with the row's id and the error's name, not its message, which can quote the address.

## Why

Sending after the commit left a gap: a crash between the two meant a Ticket whose Customer was never told, with no record of an email to retry. An error while preparing the email failed a request whose Ticket was already saved, so staff would be told to try again and create a duplicate. The form also waited on Resend while someone stood at the counter.

This is the transactional outbox pattern, and the database we already have is enough for it, a queue server would add something to run without closing a gap this doesn't. A sweep rather than a send right after the commit keeps one path for every email and nothing racing it. Five seconds is short enough that the email usually arrives before the Customer has left.

Ten minutes of retries meant a longer outage at Resend lost emails for good and nobody heard about it. A day covers any outage worth planning for and matches Resend's idempotency window. Past a day, the email is out of date.

## Still open

Staff can't see yet that an email failed. The Ticket detail page should say so, from `EmailLog`'s link to the Ticket. Status and reminder emails were already saved in the transaction that made them due, and they get the longer retries too. The feedback email is claimed before it's sent, so a crash in that instant loses it, which is acceptable for a request that's only ever sent once.
