# 0153: A Google account fills the User's name and picture

Date: 2026-11-13

Replaces ADR 0151's point that Google's profile picture isn't kept.

## Decision

When a Google account joins a User, at sign-up or when it's linked to an existing User, its name and picture fill what the User doesn't have yet:

- The name from Google's sign-in token, if the User has none. A name the User set stays.
- The picture, if the User has no avatar: the API downloads it from Google's image host, asking for 256 px, and stores it like an uploaded avatar (ADR 0026). A picture that can't be downloaded or read leaves the User without one; the sign-in still goes through.

The sign-in page also sends a signed-in User without a name to the name step, never on to the dashboard.

The privacy notice says the profile picture comes from Google too.

## Why

On staging, a User created by a code sign-in that stopped before the name step then signed in with Google: Google was linked but the User kept no name, and the sign-in page and the dashboard sent them to each other in a loop. Google already confirms who the person is, so asking them to type a name and upload a picture Google holds is work for nothing, and an avatar makes the team pages and activity readable from day one.
