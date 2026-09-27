# 0047: Sign-in and onboarding details

Date: 2026-09-27

## Decision

Follows ADR 0046.

**The code email is sent in the background.** The API answers `send-verification-otp` once the code is stored, and sends the email after (Better Auth's `advanced.backgroundTasks`). The email is still logged, tried and marked `FAILED` like any other (ADR 0010, ADR 0021), and a failure is logged.

**Language.** Adding `?lang=en` or `?lang=fr` to any web app URL shows it in that language and keeps it in a `locale` cookie for a year. Without the cookie, the browser's language is used (ADR 0041). The browser's requests to Better Auth send the page's language as `Accept-Language`, so the code email, and the User created by a first sign-in (ADR 0018), get the language of the page rather than the browser's.

**Referral links.** A referral link is the web app's `/sign-in?ref=<code>`, any page with `?ref=` works. The web app keeps the code in a `ref` cookie for 60 days, and a later link doesn't replace it (ADR 0032). It's sent as `referralCode` when the User creates a Business. The API ignores a code it doesn't know (ADR 0040), so the web app doesn't check it.

**Creating a Business asks as little as possible.** Two steps, one request at the end:

1. The Business's name and its business type.
2. The Location's name, prefilled with the Business's, its phone and contact email, prefilled with the User's.

The Location's time zone is the browser's, and its language the one the page is shown in. Both are changed later in the Location's settings. The phone field has a country picker and always gives the international format the API's `@IsPhoneNumber` accepts, through `react-phone-number-input`, which is built on the same `libphonenumber-js`.

**The code field** is shadcn/ui's `InputOTP` (the `input-otp` library): six boxes over one input, so pasting and the phone's code suggestion work. It submits on the sixth digit.

**Reading an Invitation.** `GET /invitations/:invitationId` gives the invited User, and only them, who invited them, to which Location and Business, with which Role, and whether it's still pending. Anyone else gets what accepting gives them: `NOT_FOUND`, or `UNAUTHORIZED` for another signed-in User. The web app's invitation page shows it before the User accepts.

## Why

Waiting for Resend made the page wait a second when the email went out, and several seconds when it had to retry. The code is valid the moment it's stored, and the email already has its own log and retries, so the page has nothing to wait for. It also makes the answer take the same time whatever happens to the email.

The language stays out of the path for the reason ADR 0041 gives, email links are already live. A query parameter works on every page, which also lets the sales site send French visitors to `/sign-in?lang=fr`. A cookie keeps the choice as the visitor moves on, like next-intl's own locale cookie.

Every field removed from sign-up is a reason fewer to give up. The time zone and the language are right for nearly everyone without asking, and the rest of a Location (address, opening hours, logo) is optional in the API already.

Phone numbers are the field people get wrong most, and a country picker that formats as you type is what people know from other apps. Validating with the library the API validates with means the form can't accept a number the API refuses.
