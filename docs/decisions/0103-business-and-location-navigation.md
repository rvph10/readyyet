# 0103: One top bar for the Business and the Location

Date: 2026-11-06

Replaces ADR 0077's switcher in the navigation panel and its picker for Owners who run one Business, ADR 0087's switcher in the sidebar and ADR 0102's Locations in the Business sidebar and table on the overview. Everything else in those stays, including ADR 0077's rule that nothing remembers a current Location, and the Location is in the URL. No route, API or database change is needed, so every email's link keeps working.

## Decision

**A top bar says where you are.** It reads `Business / Location`, each part a switcher, on every dashboard page. Search and New Ticket sit at its right on a Location's pages, and leave each page's own header. There's no logo in it, as in the sidebar. The User's row stays at the foot of the sidebar. On a phone the bar keeps only the level you're on, and the bottom navigation stays.

**The sidebar follows the level.** Each level has its own list and nothing switches inside it.

- A Business: Overview, Locations, Team, Billing, Settings.
- A Location: Today, Tickets, Customers for everyone, and Feedback, Workflow, Team, Billing, Settings for Owners and Admins, as before.
- An Owner whose Business has two Locations or more doesn't get Team and Billing in a Location's sidebar, as they live on the Business. The pages themselves stay, for a link to lead there.

**The Business part only leads somewhere for its Owner.** Access is per Location (ADR 0002), so for anyone else it's plain text, and a User at one Location has no switcher at all. There's no Business-level Role: an Admin of three Locations keeps working Location by Location.

**`/` depends on what there is to choose, one case more than ADR 0077.**

- No Membership: creating a Business.
- One Membership: that Location, an Owner's included. Their Business is one click away in the top bar.
- Only Locations of one Business, which they own, two or more: its overview.
- Anything else: the picker.

**The Business gets the pages an organisation has.**

- `/businesses/:id/locations` is the table of Locations, moved from the overview, which keeps its hero, tiles and Needs you.
- `/businesses/:id/team` lists each person once, with where they work and in which Role. An invitation can go to several Locations, one API call each, and says which were refused, like one at Essentiel's limit. A Membership stays per Location (ADR 0002).
- `/businesses/:id/billing` is an Owner's main billing page. A Location's page stays for Admins, for the trial emails, and for changing a plan, as paying is per Location (ADR 0003).

**A Location's working pages don't change,** only the frame around them.

## Why

ADR 0077 took Supabase's model and kept a switcher in reach. Its organisation level was thin then, and with the Business pages built, moving between the two levels became the hard part: a switcher in the sidebar, a separate picker, and the same list repeated in the Business sidebar. A bar that always says where you are is what makes two levels readable, and it's the part of Supabase's dashboard worth taking.

The rest isn't copied, because the users differ. Supabase's come by now and then and have many projects. Most shops here have one Location, used at a counter many times a day, so they open straight on Today and keep Team and Billing where they are: moving those away would cost every one of them a step to tidy up for a few chains. The level only takes over once there are several Locations to manage.

An Owner landing on the overview doesn't go against asking every time: it opens no Location, so no Ticket can land in the wrong shop. Staff at several Locations keep the picker.

A Business-level Role would let an Admin see across Locations, but it changes the access model of ADR 0002 for a need no shop has raised.

The Business Team page reads each Location's memberships, like the other Business pages, until a chain makes a summary route worthwhile (ADR 0102).
