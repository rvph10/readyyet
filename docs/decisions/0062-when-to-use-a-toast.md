# 0062: When to use a toast

Date: 2026-09-28

## Decision

A toast (ADR 0059, 0060) is for an action the person just took, when its result doesn't show on the page or doesn't need to stay. Anything that has to stay, needs a decision, or belongs to one place on the screen is something else.

**Use a toast when:**

- An action worked but nothing on the screen shows it: "Tracking link copied", "Label sent to the printer", "We sent a new code".
- It offers a short Undo, for an action that's easy to reverse: "K7Q2 marked as ready. Undo".
- Something finishes or fails in the background, away from where it started: "Photo uploaded", "The label couldn't be printed".
- The person has moved on to another page, where the result isn't told: "You joined Ixelles at Atelier Dubois".

**Don't use a toast when:**

| The message                                                   | Goes in                                   |
| ------------------------------------------------------------- | ----------------------------------------- |
| Repeats what the page already shows, like a pill turning lime  | Nothing, the page says it                 |
| Is about one field                                            | The field's own error                     |
| Is about the whole form, like the API unreachable             | A `FormAlert` at the top of the form      |
| Must stay until it's fixed, like a failed payment             | A `Banner`                                |
| Needs a decision, like cancelling a Ticket                    | A `Dialog`                                |
| Is needed later, like a new Ticket's code                     | The page it belongs to                    |

The Customer's tracking page has no toasts: what the Customer does there, like saying they've collected their item, changes the page itself.

**Undo over "Are you sure?"** An action that's frequent and can be reversed happens at once, with Undo in its toast. A confirmation dialog is kept for what can't be undone: cancelling a Ticket, removing someone from a team, deleting a Location.

**In the app today,** two actions show a toast: sending a new sign-in code, which otherwise only restarts a countdown, and accepting an invitation, which leads to a Location page that doesn't say it was just joined. The accept action returns the Location instead of redirecting on the server, so the page can raise the toast before it navigates.

## Why

A toast disappears in seconds and appears away from what it's about, so it can only carry news that's fine to miss. The test is whether missing it causes harm: if not, it's a toast, and if it does, it's a field error, an alert, a banner or a dialog. Toasts for results already on the screen train people to ignore them, which costs the ones that matter.

Asking before every Status change would slow down the counter for the rare mistake, and an Undo fixes the mistake without asking everyone else. Cancelling a Ticket ends the job for good, so it still gets a dialog.
