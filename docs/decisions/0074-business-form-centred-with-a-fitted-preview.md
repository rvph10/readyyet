# 0074: The Business form centred, its preview fitted, and Other typed in place

Date: 2026-10-05

## Decision

Changes the layout of ADR 0072:

- The form is centred down its half of the page. Both steps are at least as tall as the first, with their buttons at the bottom, so the buttons stay in the same place from one step to the other.
- The preview's panel is held to the window's height while the form scrolls, and the ticket preview shrinks to fit the panel when a long Workflow would run past it, never growing past its own size. `FitToHeight` measures it and sets the scale through the CSSOM.

And the detail of ADR 0071 is typed in the Other card itself: `RadioCards` takes an `other` option, last, whose card grows from its column to the whole row once chosen and turns into a text field, focused, with what to type as its placeholder. The cards wrap in a row instead of sitting in a grid, since a grid's spans can't be animated.

## Why

A form anchored to the top left empty space under it on tall screens, and the buttons jumped between the two steps, which have different heights. A six-step Workflow pushed the preview past the bottom of a laptop screen.

A separate field under the cards for Other's detail read as one more question for everyone. In the card, it's the answer to the same question, there only for the owner who picked it.
