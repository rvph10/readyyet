# 0066: Form steps, the phone's country list, button text and a character counter

Date: 2026-10-05

## Decision

**Form steps.** A form split over several pages shows `Steps`: numbered bubbles joined by a line, each with its step's name, drawn like a Workflow's markers (ADR 0054) but in ink only. A done step is an ink bubble with a check, the current one an ink bubble with its number and a ring, an upcoming one outlined with a muted number. The Business form uses it instead of a `ProgressBar`, which stays for uploads.

**The phone's country list.** `PhoneField` draws its own country select instead of the library's. The field shows the chosen flag and a chevron under a transparent native `<select>`, so phones keep their own picker. Where the browser has the customizable select, the list opens as `SelectField`'s (ADR 0056), each country with its flag, name and calling code, Belgium, France, Luxembourg and the Netherlands first, then a divider and the rest A to Z. Elsewhere the browser's own list shows the countries' names only.

React refuses elements inside an `<option>`, so each flag is a `data:` SVG set as a CSS variable through the CSSOM, from the SVG strings of `country-flag-icons`. It's now declared in `web/package.json` at the version `react-phone-number-input` already installs, 1.6.20, and the library's React flags are no longer imported, so the flags are bundled once.

**Button text.** Replaces the button text sizes of ADR 0049 and 0057, one step up the type scale: `sm` from `label-xs` to `label-sm` (14px), `md` and `lg` from `label-sm` to `label-md` (16px), the size of an input's text. Heights don't change.

**Character counter.** A `Field` or `TextareaField` with a `maxLength` shows its count, like "85/100", under its right edge once the value reaches 80% of the limit. A Business's and a Location's name are 100 characters, the API's `NAME_MAX_LENGTH`.

## Why

A progress bar said how far along the form was but not what each step asks for. Named steps show what's coming before it's reached.

The library's country select was the one control on the form that didn't look like the others, and a flag beside each country is how people find theirs in other apps. Declaring a package that's already installed adds nothing to download and keeps the native select ADR 0056 chose, where a custom list would have lost the phone's picker.

At 12px and 14px, button labels read smaller than the text around them, most of all a 48px button beside 16px inputs.

`maxLength` stops the typing without saying why. The counter says it before the limit is reached, and stays out of the way for the usual short name.
