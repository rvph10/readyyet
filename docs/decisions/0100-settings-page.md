# 0100: The Location Settings page

Date: 2026-11-06

Builds the screens for what ADR 0029, 0034, 0036 and 0039 let a Location set, and ADR 0017's deletion. The API needed no change.

## Decision

`/locations/:locationId/settings` is for Owners and Admins, and a 404 for an Employee, like the API.

**It looks like settings, not like a working page.** Where the rest of the dashboard is a bento (ADR 0087), this is one sheet with its own menu: Your shop, Opening hours, Tickets, Google reviews and, for the Owner, Delete. One section shows at a time, in rows with the setting's name and purpose on the left and its control on the right, and it's edited right there. A bar at the bottom of the section holds Discard and Save, which wake when something changes and never move. The section is in the URL as `?section=`, and switching keeps unsaved changes in the other sections.

**The Google review link is bold while it's missing on a plan that includes it:** "Off" in lime in the menu, and a lime notice in its section. Without Pro, the section says so and links to Billing. Whether a link is valid stays the API's decision, by host and path (ADR 0039), and its refusal shows on the field. The section gives Google's own three steps for finding the link, with links to the Business Profile and to Google's guide, and a button to test the link, as the API can tell it's a review link but not whether it's this business's.

**Opening hours are edited per day:** open or closed, up to two ranges, with one action to copy Monday to the other weekdays, which is how most shops' weeks look.

**Deleting the Location is the Owner's alone,** in its own section, and asks for the Location's name to be typed first, since it's final and cancels the subscription at once.

The Business's own name and logo, and transferring ownership, aren't here. They belong to the Business (ADR 0017, ADR 0051), on its own settings page.

## Why

Settings are visited rarely and read as a list of choices, not as a day's work, so a tile for each topic made them look like another dashboard. A menu with labelled rows is what people already know from other products' settings, and it leaves room for more settings without rearranging anything. This is the one place where editing isn't in a side panel: here, editing is what the page is for.

A shop has no other way to learn that Customers aren't being asked for feedback, so a missing link has to be noticed on this page. That also ends the dead end ADR 0096 left, where Feedback pointed here with nothing to set.

Typing the name is the familiar guard for deleting something whole, as GitHub and Vercel do it, and a Business with several Locations can have similar pages open side by side.
