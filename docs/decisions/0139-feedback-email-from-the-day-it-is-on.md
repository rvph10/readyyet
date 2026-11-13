# 0139: The feedback email only for Tickets created once it's on

Date: 2026-11-12

## Decision

A Location stores when it turned the feedback email on (`feedback_emails_since`) instead of a yes or no. The email goes only to Tickets created since then. Turning it off clears the date; turning it on again starts a new one, while turning it on when it's already on keeps the first. The API still reads and writes `feedbackEmails` as a boolean.

This changes how ADR 0131's switch is stored, not what the shop sees.

## Why

ADR 0131 relies on the Customer being told at drop-off, by the line in the ticket-created email, that they'll be asked how it went. A Ticket created while the email was off had no such line, and would still have been asked once the shop turned it on (user decision, 2026-11-12).
