# 0151: Sign in with Google

Date: 2026-11-13

Builds on ADR 0011 (sign-in by emailed code), which stays the default.

## Decision

The sign-in page offers "Continue with Google" under the email field, through Better Auth's Google provider. The API handles the whole exchange and sends the User back to the sign-in page, with the reason when it failed. Signed in, the page does what it does after a right code, then goes on to where they were going: it counts a new User's sign-up and, for a returning User, switches the device to their own language (ADR 0118).

- An existing User whose address Google confirms gets the Google account linked to them: one person, one User, whichever way they come in.
- Only name, email and the Google account ID are asked for. Google's profile picture isn't kept, as the avatar is a file the User uploads (ADR 0026).
- Google always shows its account chooser, so a shared computer doesn't sign in the wrong person.
- The staging allowlist (ADR 0150) is checked when a User is created and when a session is, since a Google sign-in never asks for a code.
- The Google app's contact address is support@readyyet.app. Production and staging each have their own OAuth client, staging's also allowing localhost.

## Why

Most shop owners already have a Google account on their phone. One tap is faster than waiting for a code, and doesn't fail when the code email lands in spam.

## Consequences

The privacy notice names Google as a recipient. A User created through Google gets the browser's language rather than the sign-in page's, as the page can't pass it through Google. The Google app must stay published and its brand verified for the consent screen to show ReadyYet's name.
