# 0015: Customer emails

Date: 2026-09-23

## Decision

### Who receives what

| Recipient | Email | When |
| --- | --- | --- |
| Customer | Ticket created, with the tracking link | Right after the ticket is created |
| Customer | Status update | 2 minutes after the ticket reaches a notifying Status (below), if it's still there |
| Customer | Tracking link, again | When staff use "resend tracking link" |
| User | Sign-in code | ADR 0011 |
| Invitee | Invitation to a Location | Existing invitation flow |

Staff receive no email about ticket activity, they work in the dashboard. Billing emails (trial ending, failed payment, receipts) will come from Stripe's own customer emails when billing is built, not from ReadyYet.

A Customer without an email address receives nothing, the QR code at drop-off covers them (ADR 0004).

### Notifying Statuses

Only these Statuses send an email, a fixed list in code, not configurable per Location:

| Status | Why |
| --- | --- |
| `READY` | The customer can come and collect their item |
| `AWAITING_APPROVAL` | The customer has to accept or refuse a quote |
| `AWAITING_CLIENT_INFO` | The shop can't continue until the customer answers |
| `CANCELLED` | The job won't happen, the customer still has to collect their item |
| `REJECTED` | The job can't be done, the customer still has to collect their item |

Every other Status, work in progress or delays alike, is visible on the tracking page only. `COMPLETED` sends nothing, the customer is at the counter when it happens.

The `CANCELLED` and `REJECTED` emails carry a fixed, translated message asking the customer to contact the shop, plus the Location's phone and email. There's no free-text reason written by staff.

### Delay before a Status update is sent

A Status update email is queued, not sent, when the Status changes. It's sent 2 minutes later only if the Status event that queued it is still the ticket's latest. A change undone within that window (ADR 0016), or followed by another change, never reaches the customer. The window is the same as the undo window in ADR 0016, on purpose.

In practice the change queues a row in `pending_status_notification`, due 10 seconds after the undo window closes so an undo at the very end of its window can't race the send. A sweep runs every 30 seconds, so the email leaves between about 2m10s and 2m40s after the change. The row is deleted along with its Status event, which is how an undo cancels it. A sweep claims a due row (a short lease) before sending, so overlapping sweeps can't send it twice, and a crash mid-send retries it instead of losing it.

The ticket-created email is sent immediately, there's nothing it could contradict.

### Sender, content and language

- Sent as "*Location name* via ReadyYet" from `EMAIL_FROM`'s address, with Reply-To set to the Location's contact email, so a customer's reply reaches the shop.
- Every customer email contains the tracking link and a "stop updates for this job" link.
- Language: the Customer's `locale` if staff set one at drop-off, otherwise the Location's `locale`, which is required. The tracking page opens in the same language. Adding a language means adding it to the `Locale` enum and translating the catalogue and the email templates, no design change.

### Stopping updates

The "stop updates" link stops every further Status update email for that one ticket (it records the time on the Ticket), and is exposed through the `List-Unsubscribe` and `List-Unsubscribe-Post` headers so mail clients can offer their own one-click button. The staff "resend tracking link" action still works afterwards, it's an explicit request, not an automated update.

In practice both lead to the public `POST /tracking/:code/stop-notifications`: the web page's button calls it, and `List-Unsubscribe` points straight at it, since a mail client's one-click request (RFC 8058) has no browser to load a page in. It sets `Ticket.notifications_stopped_at` once, and the status email sweep skips any ticket where it's set, a change already waiting included. Staff see the stop time on the ticket, so a customer who got no email isn't a mystery.

## Why

An email on every Status change teaches customers to ignore ReadyYet's emails, and every "mark as spam" damages the sending reputation all shops share. The tracking page already shows every step, emails are for what the customer has to act on or needs to hear straight away. A fixed list keeps behavior identical across every Location and leaves nothing to configure.

The 2-minute delay exists because staff misclick, and an email saying "your item is ready" can't be taken back. Waiting briefly, then checking the Status still holds, costs the customer nothing and removes the most misleading failure there is.

No staff-written reason on `CANCELLED`/`REJECTED`: it would be the first staff free text sent straight to customers, untranslated and unreviewed, and a hurried remark can hurt the shop more than no reason. The explanation belongs in a conversation, the email makes that one reply away. This keeps ADR 0007's stance that quotes and information exchanges happen outside the system in v1.

Language lives on the Customer as well as the Location because a single shop can serve customers speaking different languages at the same counter.

These emails are transactional and don't legally need an unsubscribe, the per-ticket stop link is there because it's cheap and a customer who wants fewer emails will otherwise use the spam button instead.
