# 0141: Adding a shop, and saying what a plan holds

Date: 2026-11-12

## Decision

**A new Location's plan is chosen and paid in the drawer that adds it** (ADR 0110). After its name, trade and contact, a fourth step picks Pro or Essentiel, monthly or yearly, and "Create and pay" creates the Location, then opens Stripe Checkout for it. A later Location still has no trial (ADR 0082). If the checkout doesn't open or is left, the Location stays without a plan and its billing page is where it's finished.

**A Location without a plan says so, the same way whether it never had one or its plan ended**: "No active plan, choose a plan to create Tickets", rather than "paused" and "again", which only fit a plan that ended.

**The trade starts as the Business's first Location's, folded.** The drawer shows it as "the same as your other shops", with a button for a shop that does something else. It isn't locked to the Business.

**On Pro, a new Location can start from another Location's own Workflow.** `POST /businesses/:id/locations` takes `copyWorkflowFrom`, a live Location of the same Business with a custom Workflow, whose steps are copied into a Workflow of the new Location. It's offered only when Pro is chosen; the copy is used once the Location is on Pro, like any custom Workflow (ADR 0031).

**The API says whether Pro's features are on.** `BillingDto.hasPro` (a trial is Pro, a frozen Location isn't, ADR 0031), and `WorkflowDto.custom` for a Location's own Workflow. The web app reads them instead of working them out from the plan, and shows one plan lock wherever a Pro feature is missing: a lime card with a Pro pill, what the feature does, and "Move to Pro", or "Choose a plan" with a line saying nothing is lost when the Location has no plan.

**The Business switcher offers a new Business**, the way to `/businesses/new` once an Owner's first exists.

**A trial can be started again with another email address**, as the trial is per Owner (ADR 0082). This is accepted until it's seen happening: tying the trial to the shop, by its Google listing (ADR 0126), is the way then.

## Why

A Location added after the first landed on a billing page written for a plan that had ended, so it read as blocked without saying a plan was needed. Asking for the plan before creating it, with the price, is how Supabase adds a project to an organisation, and leaves no shop that looks broken.

A chain's shops share one trade, so choosing it again for each only invited a wrong pick. Some shops do more than one (shoe repair and keys), so it isn't locked.

The web app derived Pro from `plan === "PRO" && !frozen` in five places and missed it once: an ended trial keeps plan PRO, and the Workflow page still offered editing. One answer from the API, and one lock with the way to the plan that unlocks it, make what each plan holds the same everywhere, which is what turns a limit into a reason to upgrade.

A second trial needs a new account and the whole shop set up again every two weeks, which few will do. Checking listings, phone numbers or addresses would cost more than it saves before there are paying shops.
