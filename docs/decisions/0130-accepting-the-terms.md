# 0130: Accepting the terms

Date: 2026-11-10

## Decision

**Creating a Business accepts the terms.** Above the Create button, a sentence says that clicking it accepts ReadyYet's terms of service, including the data processing agreement, each a link opening in a new tab so the form stays filled in. There is no checkbox: between businesses no law requires one, and a box ticked in advance would prove less than the sentence.

**Each acceptance is a row**, `terms_acceptance`: the Business, the User who accepted, the version and when. The version is `TERMS_VERSION` in the shared package, the date the terms in force were published. The web app sends the version it showed, and the API refuses any other, so a page left open across a change can't accept terms it never displayed.

**An Owner who hasn't accepted the version in force** sees a banner on every page of the Business and its Locations, with the two links and an "I accept" button, until they do. That covers Businesses created before this decision, and later a version Owners must accept again: publishing it means changing `TERMS_VERSION`. Only the Owner is asked, an Admin or Employee works under the Owner's contract. `/me` says for each Business whether the terms in force are accepted.

The terms are on the site, at `/{locale}/terms`, the data processing agreement in it at `#dpa`; the site's legal pages must keep those paths.

## Why

The contract has to be proven: who accepted, which text, when. Belgian law (Code of Economic Law, XII.7 and XII.8) asks that the terms be available before the order and storable; the Court of Justice accepts a click as written agreement to a choice of court when the terms can be saved (El Majdoub, C-322/14), which the terms' Brussels clause relies on. The data processing agreement must be in writing, electronic form included (GDPR art. 28.9).

A sentence beside the button is what Stripe, Shopify and Notion do, and asks nothing more of a shop owner at the moment they're starting. Asking existing Owners with a banner rather than blocking the app keeps the shops working while they read.
