# 0073: Form checks with zod

Date: 2026-10-05

## Decision

The web app checks a form's values with a zod schema before sending them, instead of checks written by hand or the browser's own validity. The schema is shaped like the API's request body, so `fieldErrors` in `web/src/lib/validation.ts` names each issue by the same path the API uses ("location.contactEmail"), and the form's error and the API's land under the same field. Each check carries its message in the page's language.

zod is the version the API already uses for its environment (4.6.5). Text limits, like `NAME_MAX_LENGTH`, move from the API to `@readyyet/shared`, so a DTO's `@MaxLength` and a form's `maxLength` and schema read the same number. The API keeps class-validator for its DTOs.

The Business form is the first to use it. The sign-in form still uses the browser's validity through `validityMessage`, until it's moved over.

## Why

Checks written one by one drifted from the API's: the browser took "paul@gmail", which `@IsEmail` refuses, so the owner only learned after sending. zod's email check, like `@IsEmail`, wants a domain with its ending, and the phone is checked with the library `@IsPhoneNumber` uses. One schema per step says in one place what the step accepts, rather than spreading it over handlers and input attributes.
