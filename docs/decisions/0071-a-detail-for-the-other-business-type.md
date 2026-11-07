# 0071: A detail for the Other Business type

Date: 2026-10-05

## Decision

A Location of Business type `OTHER` can say what it does in the owner's words, in `businessTypeDetail`: optional, up to 100 characters, null when not given. `POST /businesses` takes it in `location` and refuses it with any other type. Location responses return it.

The Business form asks for it, optionally, under the type choices once Other is chosen. Where a Location's Business type is shown, the detail is shown in place of "Other" when there is one, starting with the ticket preview beside the form (ADR 0070). `OTHER_BUSINESS_TYPE` in `@readyyet/shared` names the code for the API and the web app.

It's set when the Location is created. Changing it waits for the Location's settings page, which doesn't exist yet.

## Why

"Other" told customers nothing about the shop, and told us nothing about which Business types are missing. One optional field fixes both, without asking the owners whose type is listed for anything more.

A column on the Location, rather than a separate list of suggestions, keeps the detail with the Location it describes, where it's shown.
