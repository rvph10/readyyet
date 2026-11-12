# 0142: What each member did, for the whole team to see

Date: 2026-11-12

Replaces one line of ADR 0116, "no counts per person: it's for handing over, not for watching people". The Activity tile itself is unchanged.

## Decision

**Each member of a Location has a profile there, open to everyone on its team**, every Role alike: `/locations/:id/members/:userId`, from `GET /locations/:id/insights/members/:userId`. It shows their picture, name, Role and when they joined, then what they did this month on the Location's clock, and since they joined:

- Tickets created,
- steps moved on: every Status change they made after creating, to any step,
- of those, marked Ready and handed back (Completed).

Only this Location's work counts, and only a current member has one: someone who left gets a not-found, like any stranger.

**The Activity tile leads there.** Each row starts with the member's real picture rather than "You" or a first name, and the sentence starts with the verb. The picture opens a small card with their name and a link to the profile; the rest of the row still leads to the Ticket. The Team page links each name to the same profile.

**A public Business page, if one comes, shows no member's numbers by name** unless that member turns it on themselves.

## Why

The user wants the team's work to be seen and shared: in a small shop, who handed back thirty items this month is something to be proud of, and a new colleague learns who to ask. Open to every Role, the numbers say the same thing to everyone, which keeps them from becoming a manager's private tool.

Counting only what's done at this Location, and only for current members, keeps the profile about the team as it is. Someone's work at another shop of the Business is that shop's.

Inside the team, a member's work is part of the job. Shown to the public under their name, it becomes personal data published about them, which needs their own choice (GDPR), so it stays off until they turn it on.
