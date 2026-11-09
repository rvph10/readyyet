# 0119: Pages load in their own tiles

Date: 2026-11-08

Replaces ADR 0094's page skeletons, one hand-drawn `loading.tsx` per page, which are all gone from the dashboard. Its `staleTimes` stay. The Customer's tracking pages keep theirs.

## Decision

**A page is drawn at once, and only what waits for data shows a placeholder.** The page itself waits only for what's quick and already read by the layout (the User, the shop). Its title, headers, tiles, links and labels are the real ones from the first paint. Each part that needs data streams in its own `<Suspense>`, so a fast part doesn't wait for a slow one.

**A tile is the same component loading or loaded.** Given no data it draws its own frame and title, with placeholders where its numbers, rows or chart go, at the size they'll take, so nothing moves when they arrive. There's no separate skeleton to keep in step with the page.

**Every dashboard page works this way:**

- **Today:** the hero, Activity and Up next show at once with their labels. The day's numbers and Up next come with the overview, the month and Activity with the insights, each in its own tile. The setup guide comes in when it knows it has something to show. An empty shop's page is only known once the overview says so, and swaps in then.
- **Lists (Tickets, Customers, Feedback, Team, Business Billing and Team):** the panel, its tabs or search and its column headings show at once, the rows wait. A list keyed by its tab, search, page and sort shows its rows loading straight away when one changes. Counts on tabs come in on their own.
- **A Customer or a Ticket:** named after its data, so the header's title waits too, while its breadcrumb and every panel's title show. A Customer's card, numbers and Tickets each come on their own.
- **Settings and the profile:** the sheet and its section menu show at once, each section's heading over field rows while its fields load. The menu's "Off" for Google reviews comes in on its own.
- **Workflow and Billing:** the panels show, their contents wait together, as one answer fills them.
- **A Business's home and the shop picker:** the hero and every shop's tile with its name show at once, the numbers wait in each tile.

What a few pages share is one component each: `RowsPlaceholder` for a list's rows, `SectionLoading` for a sheet's section, and a page header whose title can wait.

## Why

Hand-drawn skeletons looked alike from one page to the next and fell behind every redesign: Today's still showed the stats strip and table it had replaced. Drawing the real page and leaving holes for the data is what Vercel, Linear, Stripe and GitHub do, and what Next.js recommends with streaming. It's never out of date, and the page someone clicked is the one they see straight away.
