# 0077: Choosing a Location, and the dashboard's navigation

Date: 2026-11-04

## Decision

**`/` depends on what the User has to choose.** With one Membership it goes straight to that Location, with none to creating a Business. With two or more it shows a picker: Locations in cards grouped under their Business, each with the User's Role. It asks every time, nothing remembers the last Location. A Business's Owner also sees its settings and a way to add a Location there.

**Two levels of pages.** Everyone works under `/locations/:locationId/`, in a navigation panel that follows the Role: Tickets and Customers for all, Feedback, Team, Workflow, Billing and Settings for Owners and Admins, as the API's own role rules have it. Under `/businesses/:businessId` are the Owner's pages. A page the Role can't see is a 404.

**The Location is in the URL.** There's no "current Location" in a session or a cookie. A switcher at the top of the navigation panel is a list of plain links, only there with something to switch to. It opens a Location's Tickets, not the section that was open.

**The navigation** is ADR 0049's floating panel at 1024px and up, and a drawer under it, with a bar over the page saying which Location this is. It ends with who's signed in and a way out.

**Pages not built yet** show a "coming soon" panel in the shell, so the navigation can be used and an email's link to billing or feedback leads somewhere. Each is replaced as it's built.

`GET /me` returns each Business's `logoUrl` for the cards.

## Why

The model is Supabase's, an organisation level above projects with a switcher always in reach, with one change. Supabase's users come by now and then and often have many projects, so a picker costs them little. Staff here use the app at a counter many times a day, and most work at one place, so a picker they must always click through would only slow them down.

Locations are the cards and a Business only a heading because access is per Location (ADR 0002): a User can work at unrelated Businesses, and an Admin may reach only one Location of a Business.

Asking every time avoids a Ticket created in the wrong shop by a counter that reopened yesterday's Location, and needs nothing stored. Live numbers on the cards, like how many Tickets are ready, are left out until an API exists for them. So is one list across every Location, which also makes it easier to act on the wrong shop.

The switcher's entries are links rather than `Menu` actions so they open in a new tab like any link, which the URL makes possible.
