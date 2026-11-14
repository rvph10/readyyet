# 0155: Deleting a Ticket, and the sample Ticket

Date: 2026-11-13

Replaces the rule in `docs/architecture/data-model.md` that a Ticket is a permanent record with no deletion flow.

## Decision

An Owner or an admin can delete a Ticket from its page, after a confirmation. An employee can't.

- The Ticket goes for good, with its Status history, photos (the objects too), feedback and any status email still waiting out the undo window. Emails already sent stay in the email log without it.
- Its tracking link stops working.
- Its Customer stays, unless this was their only Ticket and they have no email or phone: nothing of them is left to keep or reach.
- Its number (ADR 0154) is given again only if it was the newest of its Location.

The empty Today page, and the first step of the setup guide (ADR 0117), offer **Try a sample Ticket**: an ordinary Ticket titled "Sample item" for "Sample Customer", with no email, so nothing is sent. It opens on its page, where the shop moves it along, shows the QR code and opens the tracking page. Deleting it removes the made-up Customer too and gives `#1` back, so the first real Ticket is `#1`.

## Why

A Ticket made by mistake, or one made to try the app, had no way out: it stayed in the list, the stats and the Customer's history. The sample needs the same way out, and a flag that keeps a "sample" out of every count would have to be remembered by every query that reads Tickets. One delete serves both.

It's the Owner's and admins' only, because a deleted Ticket is gone from the shop's history and stats: the person who made a mistake isn't the one who can erase it. A soft delete would keep a record nobody can see, while the Customer's data on it is better gone.
