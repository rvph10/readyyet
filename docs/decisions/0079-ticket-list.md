# 0079: The Ticket list

Date: 2026-11-05

Builds on ADR 0014's API and takes one thing back: it expected an infinite-scrolling list.

## Decision

**A Location opens on its Tickets** at `/locations/:locationId`, newest first, as a table from 768px and as cards on a phone. A row shows the title, tracking code, Customer, Status, expected date and the day it was received. The whole row is the link.

**Five views as tabs:** Open (the default), Ready, Late, To confirm and All. To confirm lists open Tickets whose Customer says they collected the item (ADR 0028), and its tab only appears when there's one, so its appearing is the signal.

**Everything is in the URL:** `?view=`, `?q=` and `?cursor=`. The search box is the same in every view and keeps its text across them. When a search finds nothing in a view, the page offers to search all Tickets. Typing replaces the history entry, so Back leaves the list.

**Pages are links,** "Older Tickets" and "Back to newest", not infinite scroll.

**The list refreshes every minute** while its tab is visible, and on coming back to the tab. If a refresh fails, the error page retries by itself every minute, so a screen left open recovers on its own.

A long Status label wraps in its pill. An erased Customer shows as "Erased Customer" in the page's language. "Customer says collected" shows with its time, as ADR 0028 asks, and only on Tickets that haven't ended.

## Why

Staff at a counter come for what's waiting or for one Customer, and they find the second by search, so paging back through old Tickets is rare. Links need no client state, nothing to reconcile with the refresh, and a reload or shared link shows the same page.

Open by default because ended Tickets are only in the way at a counter. They're still one tab away, under All.

No counts on the tabs, the API has none, and asking for each would cost a request per tab on every load.

Each load makes up to two calls to the list route, one for its page and one to check To confirm, and every pause while searching is a load. The API's usual 60 calls a minute per route and per address is too few for that: all of a Location's screens share one address, and two or three searches could reach it. So this route and `GET /locations/:id`, asked on every load too, allow 240, as they need a session and are scoped to one Location. That's about 120 loads a minute for one address. Search also waits 400ms after typing, and the check is skipped on the To confirm tab.

A Status filter, and Tickets across Locations (ADR 0077), are left out until someone asks.
