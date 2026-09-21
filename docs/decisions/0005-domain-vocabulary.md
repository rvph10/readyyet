# 0005: Domain vocabulary

Date: 2026-09-21

## Decision

Standardized on: **Business** (not Organization), **Location** (not Shop), **Customer** (not Client), **Business type** (not Category). Full definitions live in [docs/domain/glossary.md](../domain/glossary.md). These terms are used identically in code, UI copy, and docs, no separate "technical name" vs "user-facing name" mapping.

## Why

The audience (garage owners, dry cleaners, small service businesses) is not enterprise SaaS buyers. "Organization" and "Category" read as admin-panel jargon; "Shop" doesn't fit a garage or workshop. Business/Location/Customer/Business type are plain, self-explanatory, and match vocabulary already used by comparable multi-location and repair-shop software. Keeping one vocabulary across every layer avoids the drift where code, UI, and docs each describe the same concept differently.
