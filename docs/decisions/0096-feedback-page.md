# 0096: The Feedback page

Date: 2026-11-06

Builds the page ADR 0039 promises to Owners and Admins, and that its staff email links to. The bento follows ADR 0087.

## Decision

`/locations/:locationId/feedback` is an inbox on one grid: the open message takes most of the page, with a count of Customers waiting and the list of messages beside it. The page opens on the feedback still to handle, newest first, with a second tab for what's handled, which shows who handled it and when. An Employee gets a 404, like the API.

Choosing a message stays in the browser and isn't in the URL. The list already holds each whole message, so it opens at once. Marking one handled moves on to the first one left.

A Location that can't receive feedback says why, using the same rule as the API's `asksForFeedback`: it isn't on Pro, or it has no Google review link. An empty page explains this in place of "nobody is waiting" and links to Billing or Settings. A page that still has messages shows a banner above them.

The API has no way to undo "handled", so its toast offers no Undo. A message marked by mistake can still be read in the Handled tab.

## Why

The private option exists so a shop can fix a problem the same day (ADR 0039), so what's waiting comes first and is read in full without opening anything else.

Without the explanation, a Pro Location with no review link would see "nobody is waiting" forever and take it for good news, when in fact no Customer is ever asked.

Reaching the Customer goes through their Ticket, which already shows how to contact them, so this page needed no API change.
