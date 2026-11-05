# 0079: The Ticket list

Date: 2026-11-05

Builds on ADR 0014's API and takes one thing back: it expected an infinite-scrolling list.

## Decision

**A Location opens on its Tickets** at `/locations/:locationId`, newest first, as a table from 768px and as cards on a phone. A row shows the title, tracking code, Customer, Status, expected date and the day it was received. The whole row is the link.

**Five views as tabs:** Open (the default), Ready, Late, To confirm and All. To confirm lists open Tickets whose Customer says they collected the item (ADR 0028), and its tab only appears when there's one, so its appearing is the signal.

**Everything is in the URL:** `?view=`, `?q=` and `?cursor=`. The search box is the same in every view and keeps its text across them. When a search finds nothing in a view, the page offers to search all Tickets. Typing replaces the history entry, so Back leaves the list.

**Pages are links,** "Older Tickets" and "Back to newest", not infinite scroll.

**The list refreshes every minute** while its tab is visible, and on coming back to the tab.

A long Status label is cut with an ellipsis in its pill, and shows in full on hover.

## Why

Staff at a counter come for what's waiting or for one Customer, and they find the second by search, so paging back through old Tickets is rare. Links need no client state, nothing to reconcile with the refresh, and a reload or shared link shows the same page.

Open by default because ended Tickets are only in the way at a counter. They're still one tab away, under All.

No counts on the tabs, the API has none, and asking for each would cost a request per tab on every load. A load makes two calls to the list route, for its page and to check To confirm. With the API's limit of 60 a minute per route and per address (`app.module.ts`), that's 30 loads a minute for a whole shop behind one address, well above a refresh a minute per screen plus searches. A shop that reaches it sees the error page, so this is the number to watch once real shops use it.

A Status filter, and Tickets across Locations (ADR 0077), are left out until someone asks.
