# 0039: The thank-you email asks for private feedback only

Date: 2026-09-25

Settles the consent question ADR 0027 left open, and implements it with that change.

## Decision

### The email

- The thank-you email sent after `COMPLETED` asks the Customer how it went, and nothing else. It never contains the Google review link, an offer or a discount.
- Its button opens the completed Ticket's tracking page. That page shows both choices side by side, as ADR 0027 describes: leave a review on Google, or tell the shop privately.
- The ticket-created email gets one more sentence: after picking the item up, the Customer gets one email asking how it went. Its "stop updates" link, already in every customer email, stops that one too.

### When it's sent

- The feature is on for a Location on Pro that has set its Google review link. A trial is Pro (ADR 0031). A frozen Location (a trial that ended without a plan, or an ended subscription) gets neither the email nor the choices on the tracking page, and neither does Essentiel. This replaces ADR 0027's "free plan or trial" wording, written before ADR 0031 removed the free plan.
- The email is queued when the Ticket reaches `COMPLETED`, like a Status email (ADR 0015), so an undone `COMPLETED` sends nothing. Whether it's sent is decided when it's due, with the Location's plan and link at that moment.
- A Ticket gets at most one. A Ticket completed again after being reopened sends no second email.
- The Google link must be an `https` link on a Google domain: `g.page`, `search.google.com`, `www.google.com`, `google.com`, `maps.google.com` or `maps.app.goo.gl`.

### Private feedback

- Private feedback is sent from the tracking page of a `COMPLETED` Ticket, while its link is valid and the feature is on. Each Ticket takes one.
- Each piece of feedback emails the Location's Owner and Admins at once, so an unhappy Customer's message isn't left unread in the dashboard.
- Owners and Admins list it newest first and mark it handled. They can still read it after the Location moves to Essentiel: it's the shop's data.
- Erasing a Customer deletes their feedback, it's their words. Deleting a Location keeps it, like its Tickets (ADR 0017).

## Why

**Belgium.** Asking Customers about a service they've just received is not direct marketing, as long as the message only serves that purpose (APD recommendation 01/2025, §37). The APD also counts promoting a company's image as promotional content (§33). A request to post a public Google review arguably does that, which would make it direct marketing needing prior consent. The soft opt-in exception doesn't clearly cover it either: it's for advertising the shop's own similar products or services.

**France.** The CNIL allows messages that follow up a customer relationship without promoting anything on legitimate interest, without consent, provided the Customer is informed and can object. A message with commercial content can be requalified as prospecting.

An email that only asks how it went fits both, while a Google link in it is uncertain in Belgium. The tracking page isn't an email, so neither rule applies to what it shows. Most Customers who'd leave a review still reach the Google button in one tap. The sentence in the ticket-created email is the "informed at collection" both regulators expect, and the stop link is the objection in every message.

A frozen Location has stopped paying for Pro. Its tracking links and Status emails keep working (ADR 0031), but a Pro feature doesn't.

Staff are emailed for each piece of feedback because the private option exists to let the shop fix a problem before it becomes a public review. That only works if someone reads it the same day.

The Google domains are checked so a Location can't point its Customers to an arbitrary site from the tracking page.
