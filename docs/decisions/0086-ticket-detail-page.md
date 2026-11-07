# 0086: The Ticket detail page

Date: 2026-11-05

Changes ADR 0080's "after creating, the list", as that ADR planned, and answers ADR 0081's "Still open".

## Decision

**After creating a Ticket, its page.** That's where its QR code is, while the Customer is still at the counter.

**The next step is one button, the other Statuses are in a menu.** Only moves ADR 0016 allows are offered. Undo shows for the person who made the change, for its 2 minutes.

**The QR code is large when the Customer has no working email:** no address, one that fails, or a latest email that failed. Otherwise it's behind a button, as someone may still ask for it. It's drawn by the web server with `qrcode-generator`, which has no dependencies, so the link never reaches a QR service.

**The page warns about the latest email to the Customer only,** since a later email that arrived carries the link too. The API says `RETRYING` or `GAVE_UP`, using the retry sweep's own "still wanted" check, so an email dropped on purpose raises no warning. Staff copies of feedback don't count. A temporary bounce counts as `GAVE_UP`, since it flags nothing on the Customer and the sweep doesn't retry it.

**Saving sends only the fields that changed** since the form opened, so a colleague's edit to another field isn't overwritten.

**The Ticket detail carries its own Workflow's steps.** Open Tickets keep their version when a Location's Workflow changes, so the Location's current steps could offer a refused move.

**A photo goes through a server action,** so the session stays on the web app's side. Its size limit and the proxy's are raised to 16 MB, above the API's 15 MB.

## Why

Someone at a counter needs the next move and the code to scan without looking for them. Everything else on the page is for later, when a Customer calls or a colleague takes over.
