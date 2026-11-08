# 0118: A User's profile, and one language for the app and the emails

Date: 2026-11-08

Replaces ADR 0047's "the language is kept in a cookie" for a signed-in User, and completes ADR 0018's "the User can change it afterwards". The cookie and `?lang=` stay for everyone signed out.

## Decision

**A User has one language,** the `locale` ADR 0018 gave their emails, and the app speaks it too. Choosing it, on the profile or in the menu under their name, saves it with `PATCH /me` and sets the `locale` cookie the app is drawn in. Signing in on a device sets that cookie from the saved language, so a new phone doesn't fall back to its browser's.

**The profile is a sheet like Settings** (ADR 0100), opened from "Your profile" in that same menu, in the frame of the shop or Business the User is in: `/locations/:id/profile` or `/businesses/:id/profile`. Settings and the profile share the sheet and its section menu, which is now one component. Its sections:

- **Your profile:** the photo, saved as soon as it's chosen (ADR 0026), the name, saved with the section's bar through Better Auth like at sign-up, and the email, read-only as nothing changes it yet.
- **Language:** the one above.
- **Your shops:** every Membership with its Role, a link to the shop, and Leave where the User isn't the Owner.
- **Delete account:** a danger zone (ADR 0111). Typing a word confirms. A sign-in older than 10 minutes is asked again, and an Owner who still owns shops is told to hand them over first (ADR 0018).

The API needed no change.

## Why

Two languages, one for the screen and one for the emails, meant someone could read the app in French and get English emails without knowing a second setting existed. One choice, kept on the account, is what people expect from any app they sign into.

The profile's settings are the same kind of page as a shop's, so they look and behave the same: one sheet, its sections in the URL, a bar that wakes up on changes. Keeping the frame around it means the User comes back to where they were.
