# 0083: An invitation's answer waits in the tab, not the link

Date: 2026-11-05

Replaces ADR 0064's `?then=accept` and `?then=decline`. The rest of ADR 0064 stays.

## Decision

A signed-out visitor's answer waits in the tab's `sessionStorage` during sign-in, and is removed as it finishes. The link back to the invitation carries nothing. If the answer is gone, for example after signing in from another tab, the page shows Decline and Accept again.

## Why

ADR 0064 reasoned that only a User who just signed in reaches `?then=`, but anyone with a session does. A link with `?then=accept` could add a signed-in User to a Location with no click, and `?then=decline` could burn their invitation past the confirmation ADR 0051 asks for. It also stayed in the browser's history, so Back answered a second time. A link can't write to a tab's storage.
