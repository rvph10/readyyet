# 0003: Billing is per shop, and workflow customization is the paid feature

Date: 2026-09-21

## Decision

Each shop has its own subscription, not the organization as a whole. A shop's category (garage, pressing, maroquinerie, etc.) determines its default workflow, a fixed, ordered sequence of statuses drawn from a shared, developer-seeded status catalogue. Free/trial shops use their category's default workflow as-is, no reordering or trimming. Paid shops can build a custom workflow by choosing and ordering statuses from the same shared catalogue. Statuses themselves are never custom text, only selections from the seeded, translatable catalogue.

## Why

Per-shop billing matches the real unit of value: a business with five locations pays for five shops, not one bundled org price. Restricting custom statuses to the seeded catalogue (rather than free text) avoids the translation problem, every status already exists in every supported language, so a custom workflow is still fully bilingual with no extra work. Giving workflow customization (not new statuses) to the paid tier is a clean, legible upgrade: free plans get a working default per category, paid plans get control over the sequence.
