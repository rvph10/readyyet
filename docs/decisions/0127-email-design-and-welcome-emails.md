# 0127: One email design, and emails that welcome people in

Date: 2026-11-09

Adds to ADR 0010, 0015 and 0018, which decided who gets which email but left each template to style itself.

## Decision

**One design for every email**, in `api/src/notification/email-kit.tsx`, on the dashboard's tokens: a canvas background, a white card with large rounded corners, no shadows, Figtree where the mail app loads web fonts and Helvetica elsewhere, a bold 30px headline and pine pill buttons. Each email has one **key card**, pine with a lime label, holding the thing it's sent for: a sign-in code, a Ticket and its ready date, the stars to tap, the shop's reply, the trial. Light only, declared to mail apps, so a dark mode doesn't invert pine and lime.

**Who it comes from:** ReadyYet's own emails open with its logo and name. A Customer's email opens with the shop's logo, or its name when it has none, as it's the shop writing, and ends with a small "Sent with ReadyYet" and the logo. The logo is a PNG served by the web app at `/email/logo.png`, as Gmail and Outlook don't show SVG.

**Built for mail apps:**

- The sign-in code sits alone on its line, one run of digits right after the word "code", where Apple Mail and Gmail look for one to autofill or copy. It stays out of the subject and the preview, as before, so it doesn't show on a locked phone.
- The emails that state a ready date (Ticket created, date changed) attach it as an all-day calendar event, `ready-date.ics`, one per Ticket with a growing sequence, so a new date replaces the old one in the calendar. The email log keeps attachments, so a retry sends them too.
- Every email is sent with its plain-text part as well as its HTML. The text was rendered and stored, but only the HTML was sent.
- A shop's phone, email and address are large labelled rows, each a link, rather than a line of small links.
- Customer emails keep ADR 0015's one-click `List-Unsubscribe`.

**New emails:**

| Recipient | Email | When |
| --- | --- | --- |
| Owner | Welcome: the trial and its end date, three first steps | Once, when they create their first Business |
| New member | You're in the team: their role and a way in | When they accept an invitation |
| Whoever invited them | They joined | Same moment, unless that User deleted their account |

Each is written in its recipient's language, sent once (a dedupe key per Owner or invitation), and doesn't hold up the request it follows. The welcome's replies go to `SUPPORT_EMAIL`.

## Why

The emails were plain grey cards with a heading and a black button, nothing like the app, and nothing in them stood out: a sign-in code looked like any other line. People decide from the inbox and the first screen, so the reason for each email has to be the first thing seen.

A new Owner had no email between their sign-in code and the trial ending. The welcome is where they learn what to do first, and the team emails close the loop an invitation opens, for both sides.

Payment emails (plan confirmed, payment failed) were left out for now, by choice; they'd go with this design when they come.

BIMI, which shows the logo next to the sender in the inbox, needs DNS records and, for Gmail, a paid certificate. It's a setup task, not code, and is left for later.
