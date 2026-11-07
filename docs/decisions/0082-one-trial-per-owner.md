# 0082: One trial per Owner

Date: 2026-11-05

Replaces ADR 0031's rule that a Business's first Location starts with the trial.

## Decision

Only an Owner's first Business starts on the 14-day trial of Pro. The first Location of any later Business starts unpaid, like any later Location.

## Why

Nothing limits how many Businesses a User can create, so a trial per Business gave a new 14-day Pro trial every two weeks, with no card and no new address. ADR 0050 blocks disposable addresses for this same abuse, which didn't stop it.

A User who transfers their only Business away and creates another gets a second trial. That takes a second person to accept the transfer, so it isn't worth a column to remember.
