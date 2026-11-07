# 0058: Twelve avatar colours

Date: 2026-09-28

## Decision

Replaces the avatar palette of ADR 0057. Avatars pick from twelve colours instead of five, still by the FNV-1a hash of the User's id (ADR 0053):

| Kind                         | Colours                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| 200 tint, 900 text of its hue | blue, indigo, teal, emerald, green, amber                  |
| 300 tint, 900 text           | slate                                                      |
| 700 fill, white text          | blue, indigo, teal, emerald, and slate at 600              |

## Why

Five colours meant one person in five shared a colour with any other, and all five were pale blues and greens that looked alike in a list. Deep fills with white initials double the choice without going near a Status: every Status pill is a light fill with ink text, so a dark circle with white letters can't be read as one. Orange and purple stay out even as deep fills, being the hues of Waiting and Working. White on each deep fill is at least 5.4:1, past WCAG AA.
