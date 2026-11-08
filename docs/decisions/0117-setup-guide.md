# 0117: The setup guide, after Shopify's

Date: 2026-11-08

Replaces ADR 0116's "Finish setting up" list, which only linked away.

## Decision

**Owners and Admins get Shopify's setup guide on Today,** the pattern its Polaris design system documents for a new merchant's home: one card with "x of y tasks completed" and a bar, then the tasks as an accordion. The first task left is open, with why it matters, one button and an illustration. A done task has a filled check, one to do a dashed circle. Once all are done, the card says the shop is all set.

**Each task is done where it stands.** Address, opening hours, turnaround and the Google review link open their own Settings section in a side panel, the same form as on Settings. Inviting opens the Team page's invite form, the logo a picker (Owners only, as it's the Business's). The first Ticket opens New Ticket, the first handover the Ready Tickets. Saving closes the panel, the task ticks itself off from the shop's own data, and the next one left opens.

The order is the shop's: first Ticket, address, hours, turnaround, review link, team, logo, first handover.

**Hiding is per User and per shop,** on their Membership (`setup_guide_hidden_at`), through `PUT /locations/:id/memberships/me/setup-guide`. A colleague still sees the guide they didn't hide. Settings offers to show it again, which leads back to Today. A shop with no Ticket shows the guide in place of the first-Ticket walkthrough, which comes back once the guide is hidden, and stays what an Employee sees.

Settings' field groups now lay out by their own width rather than the window's, so a section reads the same in the panel.

## Why

A list of links sent people to pages that didn't say what they had come for, and a new shop owner who leaves Today mid-setup is the one most likely not to come back. Shopify's guide has walked millions of new merchants through the same kind of setup, so copying it gives people something they may already know, rather than a pattern of our own to learn.

Hiding must last, or a guide someone chose to ignore becomes nagging. It's kept on the Membership because the guide is about one shop, and the person who hid it may still want it in another.
