# 0108: Ticket page and Today columns, breadcrumbs and sortable tables

Date: 2026-11-07

## Context

The Ticket page's bento (ADR 0090) stretched tiles to match their neighbours, which left empty space inside most of them. The back arrow only ever said "one level up". Tables had one fixed order, and the top bar's lists were wider than the buttons that opened them.

## Decision

The Ticket page has two columns that stack independently: the work (Status, details, photos) and the Customer's side (Customer, tracking link, history). The last tile of each takes what's left. Under 1280px the columns dissolve into one grid, with the Customer straight after the Status. This replaces ADR 0090's grid for this page. The undo button sits with the other Status actions, so the Status tile no longer reserves a row for it.

Today gets the same two columns, as a shop can have 50 open Tickets and the table started below the fold, then ran for dozens of rows. The stats and the table are on the left, Needs you, Coming up and the chart on the right. From 1280px the page fits the window and the table scrolls in its tile, with the Ticket's title under the Customer to free the width. Ready leads the stats, as they were an even strip.

Team is back in every shop's sidebar. ADR 0103 moved it to the Business for an Owner with several shops, which left a shop's own Team page behind a tile on another page, though people belong to a shop (ADR 0002). Billing stays on the Business.

Breadcrumbs sit above each page title, from the shop or the Business down, and replace the back arrow on every width. The top bar keeps naming the Business and the shop, so the breadcrumbs start at the level the sidebar belongs to. A shop's Today and a Business's home show none.

Table headings sort through `sort` and `dir` in the URL. Tickets and Customers are paged, so the API sorts them. Today and Business Billing already hold their whole list, so their pages sort it. Each list's default order stays as it was (ADR 0088, 0097).

The top bar's buttons have a fixed width, and their lists are exactly as wide.

## Consequences

On the Tickets page, sorting by Status groups each Status but doesn't follow the Workflow, because a Workflow's order lives on its steps, out of reach of a database sort. Today can follow it, as it holds every open Ticket. "Last update" can't sort, as it comes from the latest status event. Under 1024px a list has no headings, so no sorting.
