# 0021: Sign-in codes are not retried by the sweep

Date: 2026-09-24

## Decision

`EmailRetryService`'s sweep (ADR 0010) skips `EmailLog` rows of type `auth_otp`. A sign-in code email still gets the immediate in-process attempts every email gets, but once those fail it stays `FAILED`. Every other type is still swept as ADR 0010 describes.

## Why

A sign-in code expires 5 minutes after it's sent (ADR 0011), and the sweep only reaches a row a minute or more after its last attempt, up to 5 minutes later. A code it delivers is dead or about to be, and after an outage at Resend a User would get a batch of them at once. The User is still on the sign-in page and can ask for a new code, which is the only fix that works.
