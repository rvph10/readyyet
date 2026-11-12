# 0145: A page per trade on the sales site

Date: 2026-11-12

## Decision

The sales site has a page for each trade on the home's slider: shoe and leather repair, dry cleaning, alterations, phones and computers, watches and jewellery, garages, appliances and framing. Each path is in its language's own words, like `/fr/cordonnerie`, `/nl/schoenmaker` and `/en/shoe-repair`, with hreflang between the three and an entry in the sitemap.

A page says, for that trade: what changes at the counter, the steps its Customers see (the trade's default Workflow in the app, between Received and Ready, so a new shop gets exactly these), three questions of its own, with FAQPage data for search engines, and links to the other trades. Its words live in `messages/*.json` under `tradePage`, written for each language rather than translated. The home's trade cards lead to them, and the footer's language switch leads to the same trade in the other language.

The legal texts move from one dynamic route to four static ones (`/terms` and the rest), at the same paths, as Next.js allows only one dynamic segment at a level.

## Why

Shop owners search for their trade with their own words ("logiciel cordonnerie", "gsm herstelling opvolging"), and one home page can only answer one search well. A page per trade that says something true and specific about that trade, its steps and its questions, ranks for those searches and speaks to the visitor in their terms. Pages that only swapped the trade's name would be thin content search engines ignore, so each has its own words.

Showing the default Workflow keeps the pages honest: what a visitor reads is what the app gives them on day one.
