# 0147: No pricing page for now

Date: 2026-11-12

Replaces the pricing page of ADR 0146. The pricing switch on the home stays.

## Decision

`/{locale}/pricing` and its comparison table are gone. The site's "Pricing" links, in the nav, the footer, the trade pages and the announcement bar, lead back to the pricing on the home (`/{locale}#pricing`), whose cards no longer link to a comparison.

## Why

The user found the page far from what they had in mind. A page that doesn't convince does more harm than the home's cards alone, which already give both plans, both periods and what each includes. A pricing page can come back from a design the user chooses.
