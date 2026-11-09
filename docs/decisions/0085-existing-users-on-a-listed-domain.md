# 0085: A User on a newly listed domain keeps signing in

Date: 2026-11-05

Refines ADR 0050, which refused every listed address.

## Decision

The disposable address check only refuses an address with no User. An invitation sent to a listed address can't be answered, and its page says why instead of reporting a network error.

## Why

The list is refreshed from a community source and holds personal-looking domains. Sign-in by code is the only way in and an address can't be changed, so a refresh could lock out an Owner for good while their Location kept billing. ADR 0050's goal was never to create a User for a throwaway address, which this keeps.
