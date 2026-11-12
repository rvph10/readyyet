# 0138: Each Owner accepts the terms

Date: 2026-11-12

## Decision

The terms count as accepted for a Business only if its current Owner accepted the version in force. Acceptances are unique per Business, version and User instead of per Business and version, so after an ownership transfer the new Owner gets the same window as an Owner from before the terms, and their acceptance is recorded beside the previous Owner's.

The API still doesn't refuse requests from a Business whose Owner hasn't accepted: creating a Business already requires accepting, and the window covers the rest.

This changes ADR 0130, where one acceptance per Business and version was enough.

## Why

The contract binds whoever owns the Business. A transfer can hand it to another person or company, who never agreed to anything (user decision, 2026-11-12). Checking every endpoint for an acceptance was left out: since production opened on 2026-11-10 nearly every Business accepted at creation, so it would guard an almost empty case.
