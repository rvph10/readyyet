# 0119: Pages load in their own tiles

Date: 2026-11-08

Replaces ADR 0094's page skeletons, one hand-drawn `loading.tsx` per page, as each page moves over. Its `staleTimes` stay.

## Decision

**A page is drawn at once, and only what waits for data shows a placeholder.** The page itself waits only for what's quick and already read by the layout (the User, the shop). Its title, headers, tiles, links and labels are the real ones from the first paint. Each part that needs data streams in its own `<Suspense>`, so a fast part doesn't wait for a slow one.

**A tile is the same component loading or loaded.** Given no data it draws its own frame and title, with placeholders where its numbers, rows or chart go, at the size they'll take, so nothing moves when they arrive. There's no separate skeleton to keep in step with the page.

**Today goes first.** Its hero, Activity and Up next show at once with their labels. The day's numbers and Up next come with the overview, the month and Activity with the insights, each in its own tile. The setup guide comes in when it knows it has something to show. An empty shop's page is only known once the overview says so, and swaps in then.

## Why

Hand-drawn skeletons looked alike from one page to the next and fell behind every redesign: Today's still showed the stats strip and table it had replaced. Drawing the real page and leaving holes for the data is what Vercel, Linear, Stripe and GitHub do, and what Next.js recommends with streaming. It's never out of date, and the page someone clicked is the one they see straight away.
