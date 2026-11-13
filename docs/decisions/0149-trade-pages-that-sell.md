# 0149: Trade pages that sell

Date: 2026-11-13

Replaces the page content described in ADR 0145. The paths, hreflang, sitemap and per-language wording stay as ADR 0145 has them.

## Decision

Every trade page shares one layout, built in the site's own components without template code, and takes every word from its trade's entry under `tradePage` in `messages/*.json`:

1. A hero with the trade's title, the trial button and three assurances, beside a phone showing that trade's tracking page: a sample shop and item, its default Workflow from Received to Ready, one step done. Two cards around it show the ready email and a reminder.
2. Without and with ReadyYet, three lines each.
3. How it works in three steps, each with a small drawing of the app.
4. Six features the trade picks from one list (`FEATURES` in the page), each in its own words, Pro's marked as such (ADR 0031).
5. A worked example of what the calls cost, the same for every trade.
6. The trade in its own words, three paragraphs for search.
7. The home's pricing cards, the trade's six questions with FAQPage data, a closing call with its own title, and the other trades.

A trade's entry holds its sample (`demo`), `before`, `after`, `how`, `featuresTitle`, `features`, `guide`, `faq` and `closingTitle`. Adding a trade or changing its words touches the messages only, changing the design touches the one page.

## Why

The first pages answered the search but didn't sell: a grey box, three cards and a strip of steps, with nothing showing the product. A visitor landing from "logiciel cordonnerie" should see their own customer's tracking page first, then what changes for them, so the hero draws it with the trade's real steps. Features are picked per trade because a garage and a dry cleaner don't care about the same ones, and each says them in its own words so the pages aren't thin copies of each other.
