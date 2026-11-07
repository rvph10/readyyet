# 0107: "Shop" on screen, and no VAT in prices

Date: 2026-11-06

Replaces ADR 0031's "excluding VAT" on prices. The domain vocabulary in `docs/domain/glossary.md` doesn't change.

## Decision

**What people read says "shop"** ("magasin" in French), in the app and in emails. Code, the API, the database and our own docs keep **Location**, so the domain stays as defined.

**Prices say nothing about VAT.** ReadyYet is under Belgium's franchise regime, so no VAT is charged, and "VAT excluded" promised a charge that doesn't exist. The mention the regime requires is on invoices, not on these pages.

## Why

A shop owner says "my shop", and mixing it with "Location" on the same screen read as two different things. "Location" stays in the code because it has to cover what isn't a shop in the plain sense, like a garage, and renaming a domain term across the data model buys nothing for the reader.

If turnover nears the regime's €25,000 limit, VAT applies and these prices need to say so again.
