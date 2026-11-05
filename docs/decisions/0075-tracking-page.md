# 0075: The Customer's tracking page

Date: 2026-11-04

Builds the page ADR 0013, 0026, 0027, 0028, 0029, 0030 and 0039 describe the data and rules of.

## Decision

`/t/:code` answers "is it ready yet?" first, then "where and when", then everything else.

**What it shows, in order:**

- The shop's logo and name.
- The Status as the headline, what it means for the Customer in one sentence, the Ticket's title and the estimated ready date. At `READY` the panel is the lime fill and the headline grows, the only time either happens.
- What the Customer can do now, only when there's something to do: directions and "I already picked it up" at `READY`, call or email at `AWAITING_APPROVAL` and `AWAITING_CLIENT_INFO`.
- At a `COMPLETED` Ticket that asks for feedback, a link to give it (ADR 0076).
- The progress, the photos and the shop: opening state with the week behind a disclosure, address, phone, email. At `READY` the shop comes before the progress on a phone.

**On a large screen it's two equal columns**, the Status and progress on the left and the shop and photos on the right, with the whole week's hours shown instead of behind the disclosure. Both columns end on one line. A full-width Status panel and a wide progress panel left most of their width empty. Photos fill their row however many there are. With no hours and no photos, the shop joins the Status and the progress moves to the right, so neither column is nearly empty.

**What it leaves out:** the tracking code, the creation date, a separate history list, the time zone and the country. The first step's date already says when it was dropped off, and the progress is the history.

**The progress follows ADR 0016, where a Ticket moves freely.** A step that was passed without being reached is left out rather than drawn as done, a step left behind by a move back is upcoming again, and `CANCELLED` and `REJECTED`, steps of every Workflow, only show once they happened. A stopped Ticket has nothing upcoming. Past 7 steps, it shows the step before the current one and the next two, with a button for the rest.

**Long text wraps, it's never cut.** Titles (200 characters), names (100), addresses (200) and email addresses can all break anywhere, and the columns can be narrower than an unbreakable string. Long Status labels wrap in the vertical `WorkflowSteps` too, so the business form's preview does the same. Photos of any shape are same-sized squares, the whole picture opens over the page.

**Language.** The page opens in the language of the Ticket's emails (ADR 0015). The root layout has written `<html lang>` before the Ticket is known, so without a `locale` cookie and with a different language, the page redirects once to `?lang=` (ADR 0047), which also remembers it. A browser with the cookie keeps its language, so staff opening a link keep theirs.

**Staying current.** The page refreshes when its tab comes back into view and every 5 minutes while it's visible, inside the 15 minutes a photo's URL works and well under the route's rate limit. Dates and times are on the Location's clock.

**Reading.** The page is `noindex`, a skeleton of the same layout shows while it loads, and an unknown or expired link gets its own message, the same for both (ADR 0013).

**Pictures.** The web app's `img-src` allows the bucket through a new `S3_ENDPOINT` variable, since photos are presigned URLs on it. Ticket photos and `Avatar` use a plain `<img>`: they're resized at upload, so `next/image` only added a `style` attribute that the production Content-Security-Policy refuses.

## Why

Most Customers open this on a phone, from an email, to learn one thing. Putting the Status before the title means a long title can't push the answer down the screen, and showing actions only when they apply keeps the page calm the rest of the time.

Statuses are the shop's words for its own work, "Awaiting client info" doesn't tell a Customer it's their turn, so each is explained in a sentence, and the two that wait on the Customer put the way to answer right there.

Drawing every earlier step as done would claim work that never happened, and ADR 0016 says the timeline is what the Customer trusts.

Opening state comes from regular weekly hours, so a holiday reads as open until exceptional closures exist (ADR 0029 leaves them for later).
