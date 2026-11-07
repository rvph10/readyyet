# 0114: The same choices for every rating

Date: 2026-11-07

Replaces ADR 0076's routing: 5 stars straight to Google, 4 stars a button to Google with the private form under it, and 1 to 3 stars the private form with a quiet link to Google. The rest of ADR 0076 stays: the email's five stars, `/t/:code/review?stars=N`, and that opening it records nothing.

## Decision

Whatever the rating, the page offers the same two choices, with the same weight: a public review on Google, and a private note to the shop. No rating sends a Customer anywhere by itself. The email is unchanged.

The legal review ADR 0076 required before promotion is no longer needed for this email, as what it reviewed no longer exists.

## Why

ADR 0076 took the risk of review gating knowingly. Google's policy forbids selectively soliciting positive reviews, and filtering what gets published may count as a misleading commercial practice. The consequences would fall on the Business Profiles of the shops using ReadyYet, the pattern would be the same across all of them, and a legal review was a blocker for a first launch.

Treating every Customer the same removes the risk rather than assessing it. It costs a happy Customer one more tap to reach Google. The stars stay because they ask for less effort than writing, and the shop still hears first from anyone who chooses to write.
