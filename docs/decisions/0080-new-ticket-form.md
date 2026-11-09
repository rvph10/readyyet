# 0080: The new Ticket form

Date: 2026-11-05

## Decision

**One page,** `/locations/:locationId/tickets/new`, open to every Role, with the Customer and the Ticket side by side at 1280px and up, and stacked under it.

**One field finds or starts a Customer.** From two letters, the name field lists up to five Customers of this Location whose name matches. Choosing one replaces the Customer's fields with a card and a way to change it. Carrying on typing creates a new Customer. Email and phone are optional, as the API has them, and the language starts on the Location's and is only sent when changed.

**The title and the notes say who reads them.** The title is what the Customer sees, the notes (the API's `description`) only the team, as ADR 0013 has it.

**The date starts on the Location's turnaround date** (ADR 0036) when it has one, and is empty otherwise. The form always sends it, an emptied date as `null`, since leaving it out would bring the turnaround date back.

**Before creating, the page says what will happen to the Customer:** the address the tracking link goes to, or why no email goes out, because there's no address or earlier emails to it failed. An email can't be taken back.

**After creating, the list.** The new Ticket is its first row, so no toast (ADR 0062). This moves to the Ticket's own page once that's built, where its code and QR code belong.

## Why

Someone at a counter fills this in with the Customer waiting. Asking first whether they're new or returning is a question they often can't answer without searching anyway, and one field makes the search part of typing the name. Returning Customers keep one record, which is what the Customer's Tickets and any erasure rely on.

The list sits inline under the field, not in a floating menu, so it has nothing to position and works the same on a phone.

The search matches names only, the API's `GET /customers` doesn't look further. Someone who gives a phone number at the counter is found by name for now.
