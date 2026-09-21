# 0003: Billing is per location, and workflow customization is the paid feature

Date: 2026-09-21

## Decision

Each location has its own subscription, not the business as a whole. A location's business type (garage, pressing, maroquinerie, etc.) determines its default workflow, a fixed, ordered sequence of statuses drawn from a shared, developer-seeded status catalogue. Free/trial locations use their business type's default workflow as-is, no reordering or trimming. Paid locations can build a custom workflow by choosing and ordering statuses from the same shared catalogue. Statuses themselves are never custom text, only selections from the seeded, translatable catalogue.

## Why

Per-location billing matches the real unit of value: a business with five locations pays for five locations, not one bundled price. Restricting custom statuses to the seeded catalogue (rather than free text) avoids the translation problem, every status already exists in every supported language, so a custom workflow is still fully bilingual with no extra work. Giving workflow customization (not new statuses) to the paid tier is a clean, legible upgrade: free plans get a working default per business type, paid plans get control over the sequence.
