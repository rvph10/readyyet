# 0034: Formats for a Location's address, opening hours and time zone

Date: 2026-09-25

Implements ADR 0029 with existing standards rather than formats of our own.

## Decision

- **Address**: schema.org's `PostalAddress` fields, `streetAddress`, `postalCode`, `addressLocality` and `addressCountry`, the country as an ISO 3166-1 alpha-2 code (`BE`). All four or none, a `CHECK` enforces it.
- **Opening hours**: a list of schema.org `OpeningHoursSpecification` entries, `{ dayOfWeek: "Monday", opens: "09:00", closes: "12:30" }`, 24-hour times on the Location's clock. At most two ranges a day, in order, not overlapping. A day with no entry is closed. Stored as one JSON column, always read and written whole.
- **Time zone**: an IANA region name (`Europe/Brussels`), checked against `Intl.supportedValuesOf("timeZone")`. That list has no `UTC`, `Etc/GMT+1` or bare offsets, so those are refused. Aliases are stored under Intl's canonical name (`US/Eastern` becomes `America/New_York`). The web app suggests the zone from the country with `Intl.Locale`'s `timeZones` (`und-BE` gives `Europe/Brussels`).
- **Map link**: Google's documented Maps URL for a search, `https://www.google.com/maps/search/?api=1&query=...`, built from the address.

## Why

Formats that already exist come with their validators, their documentation and the tools that read them: class-validator checks ISO country codes, Intl knows every time zone and formats times in it, and a page can put schema.org objects in its JSON-LD as they are.

A region rather than an offset is what keeps times right and readable: `Europe/Brussels` follows daylight saving changes on its own and displays as "Central European Time", where a stored offset would be wrong half the year and show as "UTC+1".

Opening times are wall-clock strings, not instants, because 09:00 means 09:00 in winter and in summer. They're only converted with the time zone when something needs "now", like an "open now" label or a reminder sent in the day (ADR 0028).
