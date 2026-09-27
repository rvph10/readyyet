# 0046: One sign-in page for new and returning Users

Date: 2026-09-26

## Decision

Replaces ADR 0043's separate `/sign-in` and `/sign-up` pages. The web app has one page, `/sign-in`, in three steps:

1. The email address. It asks for a code (`type: "sign-in"`).
2. The 6-digit code. Once it's accepted the session cookie is set, and the page offers to resend the code or use another address.
3. The User's name, only while it's empty. Better Auth creates a User with an empty name on their first sign-in (ADR 0011), the web app sets it with Better Auth's `update-user`.

Then the page goes to `?next=` when it's a path on the web app, `/` otherwise. `/` sends a User with no Membership to create a Business, and anyone else to their first Location. An Invitation email links to `/invitations/:id`, which a signed-out visitor reaches after signing in through `?next=`, and which accepts it only when the User confirms.

The sign-in page itself checks for a session, not the proxy: a signed-in User with a name goes on to `?next=`, one without a name gets step 3. A User who closed the page before naming themselves is asked again the next time they sign in.

**Cookie.** The API sets the session cookie for the domain in `AUTH_COOKIE_DOMAIN` (`advanced.crossSubDomainCookies`), the root domain on Railway, so the web app's server receives it (ADR 0043). Locally it's unset: cookies ignore ports, so `localhost:3000` and `localhost:3001` already share it.

**Browser to API.** Better Auth's client calls the API's public address, `NEXT_PUBLIC_API_URL`, inlined in the browser bundle at build. The CSP's `connect-src` and `img-src` allow that host.

## Why

The API has no sign-up call: a first sign-in creates the account (ADR 0011). Two pages would ask for the same email and send the same code, and a visitor would have to know which one applies to them, which an invited employee who never "registered" can't. One page also never says whether an address already has an account.

Asking the name after the code, not before, keeps the first step the same for everyone, and nothing is stored for an address that was mistyped: the User only exists once the code is accepted.
