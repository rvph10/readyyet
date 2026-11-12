# 0129: Exporting a Location's data

Date: 2026-11-10

Adds to ADR 0017 (deleting a Location) and ADR 0031 (a Location that isn't paid).

## Decision

**The Owner downloads everything a Location holds**, from a new Export section of its settings, at any time and for free: one ZIP file, built as it's sent, with

- `customers.csv`, `tickets.csv`, `status_history.csv`, `feedback.csv`, `photos.csv` and `team.csv`;
- `readyyet.json`, the same data in one file plus the Location's settings, opening hours and Workflows, with a `format` and a `version` so a later change can be told apart;
- `photos/<ticket>/<photo>`, the photos still kept (ADR 0026).

Erased Customers stay in it as their placeholder rows, so every Ticket's `customer_id` leads somewhere. Status codes come with their label in the Location's language.

The CSV files are for opening in a spreadsheet with a double click: UTF-8 with a byte order mark, a semicolon between values for a French Location and a comma for an English one, as Excel expects in each region, and a value starting with `=`, `+`, `-` or `@` gets a leading `'`, so a spreadsheet never runs what someone typed as a formula. That puts a `'` before phone numbers in international format; the JSON keeps every value as it is.

**The Owner's alone**, like deleting: the file holds every Customer at once, and an Admin or Employee leaving with it is the risk worth avoiding. Five exports an hour per client.

The web app passes the API's response on from its own origin, at `/locations/:id/export`, so the browser downloads it with the session it has. A failure goes back to the section with a message instead of a bare error page.

**Deleting a Location now offers the export first**, in its confirmation, and lists that its Customers are erased (ADR 0128).

**A frozen Location keeps its contract running.** A trial that ended or a subscription that stopped freezes the Location (ADR 0031), it isn't the end of the contract: the shop can come back at any time and finds everything, and the 24-month rule (ADR 0128) still erases Customers nobody has seen. The contract ends when the Owner deletes the Location or writes to us; in the second case, the Location stays exportable for 30 days and is then deleted by hand.

## Why

The Data Act (Regulation (EU) 2023/2854, chapter VI, in force since 12 September 2025, with no exemption for small providers) requires a SaaS to let its customer take all their exportable data in a structured, commonly used and machine-readable format, to list what can be exported, and to charge nothing for it from 2027. CSV is what a shop can open, JSON is what another tool can import.

`yazl` writes the ZIP: Node has no ZIP writer, and yazl streams entries one at a time, so photos are read from the bucket as the archive is written instead of all at once. It has one small dependency. `yauzl`, by the same author, reads the archive back in the tests only.

A frozen Location still serves its Customers (tracking links, status emails), so ReadyYet still processes their data for the shop and the contract can't be said to be over. Erasing it after a set time would punish a shop that comes back late, with no gain the 24-month rule doesn't already give.
