# 0064: One invitation view, quieter destructive buttons and toasts at the top

Date: 2026-09-28

## Decision

Replaces the signed-out "Continue as" step of ADR 0051 and the toast position of ADR 0059 and 0060.

**One invitation view.** Signed in or out, an invitation shows the same card: the Business's avatar, who invites to which Location as what, Decline and Accept. Signed out, answering sends the sign-in code to the invited address and opens sign-in at its code step, with the way back carrying the answer as `?then=accept` or `?then=decline`. Back on the page, signed in, the answer finishes by itself: accepting leads to the Location with the joined toast (ADR 0062), declining shows the page as declined. Declining still asks once more first, before any sign-in. Only the team is kept for a signed-in User, the API showing it to the invitee alone.

Opening the link still does nothing by itself (ADR 0043): a mail scanner has no session, so `?then=` only finishes an answer for a User who signed in with the code sent to them.

**Business avatar.** `BusinessAvatar` shows the Business's logo, or its initials in lime on ink when it has none or it can't be loaded, like the Business's mark in the staff screens.

**`danger-secondary` button.** White with a `border` outline and `danger` text, tinted `danger-subtle` on hover. It offers a destructive action without being the one that confirms it: Decline, and Sign out, whose icon is mirrored so its arrow leaves the door. The confirming button stays the red fill of `danger`.

**Toasts at the top centre,** the older ones peeking below the newest, sliding down into place. The badge of a toast's icon pops in, then success rings outward, an error shakes and info nods, each once, only when motion isn't reduced.

**Tooltips near a screen edge** line up with that side of their trigger instead of centring on it.

## Why

Two views for one invitation meant two things to learn and an extra step: "Continue as" before the choice that mattered. Answering first and signing in after keeps the choice where the person is looking, and the code still proves the address is theirs before anything is saved.

The lime initials were the only place the brand lime stood for a Business, and a logo that failed to load showed as a broken image. Ink with lime initials is what a Business looks like everywhere else, and a failed logo falls back to it.

A red fill for every destructive button would make Decline shout louder than Accept. The outlined red says it's destructive without competing with the action most people take.

At the top centre a toast is seen where the eye starts on a page, and it no longer covers a list's last rows or a form's buttons at the bottom. The icon's motion tells the kind of news before the words are read.

A tooltip centred under a button at the screen's edge stuck out past it even while hidden, which gave the page a horizontal scrollbar.
