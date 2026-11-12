# 0146: A pricing page with a monthly and yearly switch

Date: 2026-11-12

## Decision

The site's pricing is Nexio's monthly and yearly switch (Temlis), in Ledger's look on a pine panel: two cards, Essentiel and Pro, Pro drawn out in lime as the plan the trial runs, prices turning on reels when the period changes, and the yearly side saying it gives two months. It's on the home, and it opens `/{locale}/pricing`, where Corevia's comparison table sets every feature of the two plans side by side, followed by the FAQ. The site's "Pricing" links, in the nav, the footer and the trade pages, lead to that page.

Prices are the app's (ADR 0031), written in each language's currency format. A Temlis section's own entrance is replaced by the site's shared one (ADR 0133); Nexio keeps its switch and its card glow, Corevia's table needs no script.

## Why

The cards were plain, gave the yearly price as a footnote and looked bare on phones. SaaS pricing shows the period as a choice and lets the price answer it, and a separate page with the full comparison is where a visitor who's nearly decided goes to check the one feature they care about, without making the home longer.
