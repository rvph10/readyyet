# 0152: A cancelled Ticket takes its ready date out of the calendar

Date: 2026-11-13

Adds to ADR 0127, which attached the ready date as a calendar event only to the emails that state it.

## Decision

When a Ticket is cancelled or rejected and its Customer was told a ready date, the status email carries the same event again: same UID, a higher SEQUENCE, the date the Customer was told, and `STATUS:CANCELLED`. A Customer who was never told a date gets no event. A date moved earlier or cleared still sends nothing, as ADR 0127 has it.

## Why

A Customer who added the date to their calendar kept it after the Ticket ended, and could come to the shop that day for an item that would never be ready. The email already says the Ticket ended; the event makes the calendar agree with it.
