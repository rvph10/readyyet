# 0131: The feedback email is the shop's choice

Date: 2026-11-10

Replaces the part of ADR 0039 and ADR 0125 where every Location on Pro emails its Customers for feedback. Keeps the rest of both, and ADR 0114.

## Decision

**A Location emails a Customer for feedback only if the shop turned it on**, with a new switch, "Ask for feedback by email", at the top of the Google reviews section of its settings. It's off for every Location until then, those that sent it until now included, and needs Pro to turn on, like the review link; it can be turned off on any plan. The ticket-created email's line announcing it follows the same switch.

**The tracking page still offers feedback** to every Pro Location's Customers once the Ticket is completed: they come to it themselves, it asks nothing of them.

The settings say what turning it on means: the Customer gets one email asking how it went, so the shop should tell them at drop-off, and it's the shop's decision. The menu marks the section "Off" while the email is off on Pro, instead of while the Google link is missing. The review link no longer reads as what turns requests on.

## Why

A shop is the controller of its Customers' data and ReadyYet its processor (the terms' data processing agreement). Whether an email asking for a review is a marketing message under Belgian law (Code of Economic Law XII.13 and the royal decree of 4 April 2003) is not settled; if it is, it's allowed without consent only for the shop's own customers who were told and can refuse, which every email's stop link and the line at drop-off provide. Either way it's the shop's call, made knowingly, not a default ReadyYet makes for it.

Turning it off for Locations that had it is a change they didn't ask for: a shop already relying on it must be told before this ships.
