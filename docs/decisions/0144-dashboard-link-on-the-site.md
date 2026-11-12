# 0144: The site offers the dashboard to someone signed in

Date: 2026-11-12

## Decision

While a session exists, the web app sets a `signed-in=1` cookie on the parent domain (readyyet.app), and takes it away once there's none. It holds nothing else and nothing trusts it: the sales site reads it in the browser and turns its "Sign in" link into "Dashboard", leading to the app.

The web app's proxy sets or removes it only when it no longer matches the session, so it isn't sent again on every request. It lasts 7 days, the session's length, and is listed with the other always-on cookies in the privacy notice.

## Why

The session cookie already reaches readyyet.app (ADR 0046), but it's httpOnly, and the site's pages are cached for everyone, so the server can't change them per visitor. A readable hint is how Vercel and Linear do it: the cached page stays the same, and one link changes once loaded.

It's set by the app rather than at sign-in so it follows the session however it starts or ends: a code sign-in, an expired session, or signing out, which reloads the app signed out.
