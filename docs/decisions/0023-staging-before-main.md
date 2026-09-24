# 0023: Every change goes through staging before main

Date: 2026-09-24

## Decision

- `staging` and `main` are protected by GitHub rulesets, with no bypass, the repo owner included. Neither can be pushed to directly, force-pushed or deleted. Every change is a pull request, and all five CI jobs (`shared`, `db`, `api`, `lint`, `audit`) must pass.
- A change lands on `staging` first, by a squash-merged PR: one commit per change. Its review threads must be resolved, and Copilot reviews every PR.
- Releasing is a PR from `staging` into `main`, merged with a merge commit. The required `promotion` job (`.github/workflows/promotion.yml`) fails unless the PR comes from `staging`, and waits until staging runs exactly the PR's commit, read from `/health`'s `x-release` header, with `/health` answering 200.
- No approval is required: there's a single maintainer, and GitHub doesn't let an author approve their own PR. Add one required approval when a second person joins.
- In an emergency, the owner disables a ruleset in the repository settings, a deliberate step, not a silent bypass.

## Why

Production should only get code that already ran on a real deploy: its migrations applied to a real database, the service started with the real variables, the health check passed. Staging is that deploy, the promotion job makes sure what gets promoted is what staging actually runs, not only what passed CI.

Squash into `staging` keeps its history one commit per change. `main` takes merge commits instead: squashing `staging` into `main` would create a commit `staging` never has, the two branches would drift apart and every later promotion would show old changes again or conflict.

Railway deploys every commit that reaches a branch (no watch patterns): with them, a docs-only commit wouldn't redeploy staging, staging would keep reporting the previous commit and the promotion job would never pass.
