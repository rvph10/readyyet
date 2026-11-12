# 0134: The tracking page's banner as a cover, and a shop tile that follows

Date: 2026-11-12

Replaces ADR 0109's placement of the banner on tracking pages. The rest of ADR 0109 stands.

## Decision

On a tracking page the banner runs across the top of the page, above the shop's logo and name, on a phone and a computer alike. On a phone it stays whole at 3:1. On a computer it is a band 16rem high, cropped around its middle. The shop's tile no longer holds it.

The shop's tile is as tall as what it holds and stays in view while the page scrolls, on a computer. The shop's logo fills its square edge to edge, at the largest avatar size, and overlaps the banner's lower edge like a profile picture, ringed in the page's colour, with the shop's name beside it. Without a banner it sits in line with the name.

## Why

Inside the shop's tile the banner read as a picture of the tile rather than the shop's cover, and the tile stretched to the height of the page with a gap above its contact rows. A cover across the top is what Customers know from other pages.

Whole at 3:1 across a computer's width would be over 400 pixels high and push the Status, the reason the page is opened (ADR 0095), out of the first screen, so the band is lower there and loses some of the picture's top and bottom.
