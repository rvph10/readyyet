# 0025: Rate limits key on Railway's X-Real-IP

Date: 2026-09-24

Replaces the "Known limitation" and its post-deploy TODO in ADR 0009.

## Decision

- Both rate limiters read the client's address from `X-Real-IP` (`api/src/common/client-ip.ts`): Better Auth through `advanced.ipAddress.ipAddressHeaders`, `@nestjs/throttler` through its `getTracker` option.
- `trustedProxies` stays unset.
- Locally and in tests there's no proxy and no header: Better Auth falls back to `127.0.0.1`, the throttler to the socket address.

## Why

On Railway the socket address is Railway's proxy, not the client. The throttler keyed on it, so every Customer reaching the API through the same proxy shared one 30/min budget on the public tracking page. Better Auth found no single IP in `X-Forwarded-For` and fell back to one bucket per path for everyone.

Railway documents `X-Real-IP` as the client's remote IP, set by its edge. It's one address, not a chain, so nothing has to guess which hop is real, which is what `trustedProxies` would need Railway's proxy ranges for, and Railway doesn't publish them.

It's only safe if Railway's edge replaces an `X-Real-IP` the client sends, otherwise anyone could pick their own bucket. That's checked on staging before this reaches production: from one machine, requests that each send a different `X-Real-IP` to `/api/auth/email-otp/send-verification-otp` must still hit 429 after 10 in a minute.

If a CDN is ever put in front of Railway (a proxied Cloudflare record, say), `X-Real-IP` becomes the CDN's address and this has to be revisited.
