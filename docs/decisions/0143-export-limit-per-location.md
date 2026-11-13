# 0143: The export limit counts per Location

Date: 2026-11-12

Changes one line of ADR 0129, "five exports an hour per client".

## Decision

A Location can be exported five times an hour, counted for the Location whoever asks and from wherever. A sixth gets the export section back with "this shop has already been exported five times this hour", rather than the generic failure. The download button holds for a moment once tapped, so a second tap doesn't start a second export while the first is still being built.

The export stays instant: no queue, no emailed link.

## Why

Counted per client, the limit followed an address, and an Owner on the shop's computer and on their phone, or anyone behind a changing address, could start many exports of the same Location, each reading every row and photo. Counted per Location, it bounds the work an export costs, which is what the limit is for.

An export is built as it's sent (ADR 0129), so even a shop with years of photos starts downloading at once. A queue with an emailed link would only add a wait and a link that must expire, for no shop that needs it yet.
