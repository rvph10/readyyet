# 0093: Illustrations

Date: 2026-11-06

## Decision

**Two families, recoloured to ADR 0087's palette**, stored as SVG files in `web/public/illustrations`. The Empty States Icons pack is used for empty states, and the Mind Garden pack, scenes with people, for bigger moments: errors, paying, a first Ticket and the tracking page. Blue, olive and coral become pine, lime and our neutrals. Three scenes have an `-on-pine` version with white figures, as pine shapes disappear on a pine tile.

**The Digital Actions pack isn't used.** A file is about 220 KB against 18 KB for Mind Garden, and its loud colours and second drawing style would compete with the lime.

`Illustration` loads them as plain images, decorative to screen readers since the text around each says the same. `EmptyState` takes an illustration rather than an icon.

## Why

Empty states should feel like a good moment rather than a blank tile, which an icon in a grey square couldn't do. Keeping one family per use, in our colours, stops the app looking assembled from stock art. Files rather than inline components keep them out of the JavaScript bundle and let the browser cache them.
