# 0016: Ticket status change rules

Date: 2026-09-23

## Decision

A ticket's Status can only change to a step of its own Workflow (already enforced), and additionally:

1. **An open ticket moves freely**, forwards or backwards, to any step of its Workflow.
2. **No change to the same Status.** Rejected with a conflict, so the history never shows an event where nothing happened.
3. **Never back to `RECEIVED`.** It means "just dropped off", it's only ever the first Status.
4. **`COMPLETED` only from `READY`.** Completed means the customer collected the item, which means it was ready first.
5. **`CANCELLED` and `REJECTED` from any open Status.**
6. **Ended Statuses are final for Employees.** Once a ticket is `COMPLETED`, `CANCELLED` or `REJECTED`, only an Owner or Admin can move it again (reopening it), and the reopening is part of the history like any other change.
7. **Undo within 2 minutes.** The latest change can be undone for 2 minutes after it was made: its Status event is deleted and the ticket goes back to the previous Status, as if the change never happened. After that, a correction is an ordinary new change. A ticket's first `RECEIVED` event can't be undone.

A Status change updates `Ticket.currentStatusId` and inserts the Status event in one transaction, conditional on the ticket still being at the Status the request started from, so two concurrent changes can't both apply.

## Why

The timeline on the tracking page is what the customer trusts, so the rules aim to keep it honest rather than tidy. Real work isn't linear: parts arrive and a job goes back to diagnosis, a final check fails after `READY`. Forward-only rules would push staff into picking a wrong Status to get around them, which misleads the customer more than a visible step back.

The few hard rules each prevent a specific misleading timeline: an event where nothing changed, a job that looks freshly dropped off again, an item marked collected that was never announced as ready, or a finished job silently changing afterwards. Reopening stays possible because mistakes happen, but only for Owners and Admins, who are accountable for the Location.

Undo deletes rather than appends because a misclick corrected within seconds isn't information, showing it would only confuse. Its window matches ADR 0015's email delay, so an undone change never produces an email either. Past 2 minutes the customer may already have seen the Status on the tracking page, from then on the history keeps the correction visible.
