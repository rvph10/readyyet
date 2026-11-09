# 0125: Ratings, tags and replies, with or without a Google link

Date: 2026-11-09

Replaces three rules: ADR 0039's "the feature is on for a Location on Pro that has set its Google review link", ADR 0076's "the stars aren't stored", and ADR 0027's "the feedback form is free text only, no stars". Keeps ADR 0114: every rating is offered the same choices. Keeps ADR 0039's email, which asks how it went and holds no Google link, and its other rules.

## Decision

### Feedback no longer waits for a Google link

A Location on Pro asks every Customer how it went, as ADR 0039 describes, whether or not it set its Google review link. The review page then shows the "Review on Google" choice only when the link is set. Without it the Customer can still rate and write to the shop.

### What the Customer gives

On the review page the Customer gives:

- **Stars**, 1 to 5, the one they tapped in the email already selected.
- **Tags**, from a fixed list, as many as they like: what went well ("Ready on time", "Friendly", "Good value", "Clear explanations", "Quality work") and what didn't ("Took longer than expected", "Higher price than expected", "Problem not fully fixed", "Hard to reach"). The same list whatever the rating. Never free text, so tags can one day be shown in public with no moderation.
- **A message**, optional, private to the shop as before.

Nothing is saved when the page opens, as ADR 0076 requires: mail scanners open every link in an email, all five stars included. Stars and tags are saved by the Customer's own action on the page: **Send to the shop**, or **Review on Google**. They can change their stars and tags until they send a message, which closes their answer.

A tap on **Review on Google** is recorded, so the shop can see how many Customers ReadyYet sent to Google. What they write there is never seen by ReadyYet.

### What the shop does with it

- An answer **needs a follow-up** while nobody has dealt with it and it has a message or 1 or 2 stars. Only those count in the sidebar, the bell and the staff email. A 2-star rating with no message is the Customer most likely to leave unhappy without saying it.
- The shop **replies from ReadyYet**. The reply is emailed to the Customer in the shop's name, with the shop's contact email as the reply-to address, stored with the answer, and deals with it. A Customer with no email address is called instead, and the answer is closed without a reply.
- The Feedback page shows **this month's numbers** on the Location's clock: Customers asked, answers, the average and spread of the stars, the most chosen tags, and how many went to Google.

## Why

A Location without a Google link got nothing at all: no email, no rating, no message, and a Feedback page that could only tell it why. Rating and private feedback are worth having on their own. The link only adds the Google choice.

Saving stars on the Customer's action, not on opening, is what makes the numbers trustworthy. A scanner opening five links would otherwise leave a random rating on many Tickets. The price is that a Customer who taps a star and closes the page isn't counted.

Fixed tags give the shop something to act on ("Took longer than expected" eight times this month) that stars alone don't, without the moderation that published free text would need.

A shop owner who can't see what the feature brings stops paying for Pro. "11 Customers went to Google this month" is the number that shows it working.

A reply in ReadyYet means "dealt with" is true, not just a button. The reply is part of the conversation the Customer started, so it isn't marketing (ADR 0039's reasoning).
