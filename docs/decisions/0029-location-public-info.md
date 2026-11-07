# 0029: Location address, opening hours and time zone

Date: 2026-09-24

Extends ADR 0013's list of what the tracking page returns.

## Decision

A Location gets:

- **an address**: street, postal code, city, country. The tracking page shows it with a link to Google Maps' search for that address, a plain link, no embedded map or script.
- **opening hours**: for each day of the week, none, one or two time ranges (a shop closed at lunch has two). No holidays or exceptional closures in v1.
- **a time zone**: an IANA name (`Europe/Paris`), required, chosen when the Location is created from its country, changeable by the Owner and Admins.

`GET /tracking/:code` returns the address and opening hours next to the contact phone and email it already returns. Customer emails show the address in their footer.

All of it, like the rest of a Location's details, is edited by the Owner and Admins, on every plan.

## Why

A Customer whose item is ready asks two questions before coming: where, and when is it open. Answering them on the page they're already looking at removes the phone call ReadyYet exists to avoid.

A link to Google Maps gives directions in the app the Customer already uses, without a Maps API key, billing, or a third-party script on a page that shows personal information.

Holidays are left out because they need their own screens (dates, recurring closures) and a Location can say "closed until" in a later version. Weekly hours cover most days.

The time zone is needed as soon as something happens at a time of day: opening hours mean nothing without one, and reminders (ADR 0028) are only sent during the day. It's per Location, not per Business, because a Business can have Locations in different countries.
