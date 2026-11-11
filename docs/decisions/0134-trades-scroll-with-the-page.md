# 0134: Trades scroll with the page

Date: 2026-11-11

Replaces ADR 0133's use of `swiper` for the trades slider. The rest of ADR 0133 stands.

## Decision

The trades section of the home page has no arrows and no slider library. When it reaches the top of the window it holds still, filling the window, and the page's scroll runs its cards sideways from the first to the last, which stops on the content's right edge. The page then carries on. It's a GSAP ScrollTrigger pin with a scrubbed move of the row (`site/src/lib/motion/trades-scroll.ts`).

For a visitor who prefers reduced motion, or before the script runs, the row is a plain one they scroll sideways, snapping on each card.

Lumoras' markup and CSS stay as bought. Its `slider.js` and the `swiper` dependency are removed.

## Why

The user wanted the trades to move with the scroll, and to see where they end. Swiper's loop repeats the cards forever, so a scroll-driven row built on it never reaches a last card, and its arrows only duplicate what the scroll now does. GSAP and ScrollTrigger are already on the page for the hero, so the pinned row adds no dependency and removes one.
