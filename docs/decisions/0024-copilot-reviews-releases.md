# 0024: Copilot reviews release PRs too

Date: 2026-09-24

Extends ADR 0023, which had Copilot review only PRs into `staging`.

## Decision

- The `main` ruleset also requests a Copilot review, on every push, like `staging`'s. A release PR's review threads must be resolved before it merges, as they already had to be.
- Copilot doesn't review Dependabot's PRs by itself: it only reviews PRs whose author has a Copilot seat. Request it by hand on those (`gh pr edit <number> --add-reviewer @copilot`).

## Why

A release PR is the last look at a change before production. Its description is written at release time, and a review there can catch a mismatch between what the PR says it does and what the code does, which the review of each change on `staging` never saw.
