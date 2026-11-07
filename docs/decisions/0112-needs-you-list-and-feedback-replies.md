# 0112: The bell's list, and answering feedback

Date: 2026-11-07

## Decision

The list behind the bell (ADR 0111) reads like any app's notifications: a fixed header and footer, rows grouped by kind, each with who, a badge for the kind, what happened and when, and the whole row as its link. It has no read state and no "mark all as read". Each row is work that leaves the list once it's done, so the count is always what's left to do.

Private feedback is read on its own page, which `?message=` opens on. The bell lists the latest five, and no longer has a reader of its own.

The Feedback page offers to email or call the Customer, so `FeedbackDto` carries their email and phone, which Owners and Admins can already read on a Ticket. An unanswered message says how long it has waited, and turns red after two days.

## Why

Read and unread would mean storing a state per User for something that's already gone when it's dealt with. A dismissed row that still needs doing would be worse than one that stays.

Answering was two pages away: open the Ticket, find the Customer's details, come back to mark it handled.
