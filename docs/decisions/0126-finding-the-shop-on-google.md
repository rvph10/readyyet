# 0126: Finding the shop on Google

Date: 2026-11-09

Adds to ADR 0100 and 0109, which ask the shop to paste its Google review link.

## Decision

Settings' Google reviews section, and the setup guide step that opens it, start with a search: the shop's name and town, already filled in, against Google Places. Each result shows its name, address and Google rating. The Owner or Admin picks theirs ("Yes, that's us") and ReadyYet saves its review link, `https://search.google.com/local/writereview?placeid=…`, a link shape ADR 0039 already accepts. If the shop has no address or no opening hours yet, Google's are offered with it, ticked, and saved together. Pasting a link by hand stays, under the search, for a shop Google doesn't find.

`GET /locations/:id/google-places?q=` asks Google's Text Search (New) from the API with ReadyYet's own key: no OAuth, the shop signs in to nothing. It includes shops with no public address on Google, those that go to their customers (pickup, home visits), which Google otherwise leaves out: they're shown without an address. It answers at most five places, already in ReadyYet's shapes: a postal address only when Google gives all four parts, the street with its number, and opening hours only when Save would take them, every day within ADR 0034's two ranges. A place that closes at midnight closes at 23:59; one open around the clock or past midnight is offered no hours. Owners and Admins of a Location on Pro only, as the review link it's for needs Pro, ten searches a minute and thirty a day per Location. The results say they come from Google Maps, as Google's terms ask of its places shown without a map.

Nothing from Google is stored but what the shop chose to save: the link, and the address and hours it accepted, which become its own. A rating shown later will be fetched again, not kept, as Google's terms only let a place ID be stored.

The key is `GOOGLE_PLACES_API_KEY`, required in production. It's restricted to Places API (New) on the Google Cloud project "readyyet", which has a €5 monthly budget alert. A budget alert only warns, so a daily quota on the API should be set once the account leaves its free trial, which doesn't allow editing it.

## Why

Finding the review link was the step shops got stuck on: it sits three screens deep in Google Business Profile, and without it no Customer was sent to Google. Picking a shop from a list is a step every product that connects to Google Maps uses.

Google already knows most shops' address and hours, and the shop would otherwise type them. Offering them only where nothing is set yet means a search never overwrites what the shop wrote itself.
