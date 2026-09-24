# API conventions

The rules every endpoint follows, so a new one fits without reading the others. `api/openapi.json` is the exact contract, this explains the choices behind it. Vocabulary follows `docs/domain/glossary.md`.

## Routes

- Resources are plural nouns: `/businesses`, `/tickets`, `/customers`.
- Anything that belongs to a Location is nested under it, `/locations/:locationId/tickets/:ticketId`. `LocationMembershipGuard` checks the caller's Membership and Role there, once, for the whole controller.
- The only unscoped routes are the caller's own (`/me`), what exists before a Membership does (`/businesses`, `/invitations/:id/accept`), and what needs no account (`/tracking/:code`, `/catalogue/*`, `/health`).
- An action that isn't a plain edit is a `POST` on a sub-path named with a verb: `.../status/undo`, `.../invitations/:id/revoke`, `.../transfer-ownership`. A `PATCH` only ever changes fields.

## Methods and status codes

| Request                                                                         | Success                           |
| ------------------------------------------------------------------------------- | --------------------------------- |
| `GET`                                                                           | 200                               |
| `POST` that creates something (a Ticket, an Invitation, a Membership on accept) | 201                               |
| `POST` action that creates nothing                                              | 200, with the resource it changed |
| `PATCH`                                                                         | 200, with the updated resource    |
| `DELETE`, and an action with nothing to return                                  | 204, no body                      |

## Bodies

- JSON, camelCase field names, the same names as the domain vocabulary.
- Ids are strings: uuids as they are, BigInt ids (Ticket, Customer, Membership, Workflow) as decimal strings, since JSON numbers can't hold them. Status ids are small integers and stay numbers.
- Dates are ISO 8601 strings in UTC.
- In a resource, a field with no value is `null`, never left out. An optional request field may be left out.
- Something the dashboard identifies by name comes with it, not as a bare id: `invitedBy: { id, name }`. Catalogue entries (business types, statuses) are referred to by their `code`.
- A response sends the fields its DTO declares and nothing more. Queries `select` those fields rather than `include` whole rows, see the `statusSelect` and `locationSelect` helpers. The e2e suite fails on any undocumented field.
- Unknown request fields are dropped by the validation pipe (`whitelist: true`), not rejected.

## Lists

Lists that grow without bound are paginated with a cursor, never an offset:

```
GET /locations/:locationId/tickets?take=50&cursor=<nextCursor>
{ "items": [...], "nextCursor": "..." | null }
```

`take` is 1 to 100. The cursor is opaque to the client, `null` means the last page. Short, bounded lists (a Location's members, its invitations, the catalogue) are returned whole as an array. See `docs/architecture/data-model.md#pagination`.

## Errors

Every error from our own routes has one shape, written by `AppExceptionFilter`:

```json
{ "error": { "code": "NOT_FOUND", "message": "Ticket not found", "requestId": "..." } }
```

| Status | `code`                      | When                                                                                                                         |
| ------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR`          | Invalid input. `details` lists each rejected property and its failed rules.                                                  |
| 401    | `UNAUTHENTICATED`           | No valid session.                                                                                                            |
| 403    | `UNAUTHORIZED`              | Signed in, but not a member of this Location (or not the Business's Owner), or the Role doesn't allow it.                    |
| 403    | `REAUTHENTICATION_REQUIRED` | The session is too old for this action, sign in again (account deletion).                                                    |
| 404    | `NOT_FOUND`                 | Doesn't exist: an unknown or deleted Location, or a Ticket, Customer or Invitation id that isn't in the Location of the URL. |
| 409    | `CONFLICT`                  | Not possible in the resource's current state, or lost a race to a concurrent request.                                        |
| 413    | `VALIDATION_ERROR`          | The request body is over 100 KB.                                                                                             |
| 429    | `RATE_LIMITED`              | Too many requests, `Retry-After` gives the seconds to wait.                                                                  |
| 500    | `INTERNAL_ERROR`            | A bug. Reported to Sentry, the message never says more.                                                                      |

`message` is for developers and logs, the web app shows its own text per `code`. `requestId` matches the `x-request-id` response header and the logs.

Better Auth's routes (`/api/auth/*`) are the exception: they are Better Auth's own middleware, not Nest controllers, so their errors keep Better Auth's shape, `{ "code": "...", "message": "..." }`, and they aren't in the OpenAPI spec (ADR 0008). The web app talks to them through Better Auth's client, which handles that shape.

## Authentication

A Better Auth session cookie, set by the email OTP sign-in (ADR 0011). There are no API keys or bearer tokens: the only client is our own web app, on the one origin CORS allows (`WEB_URL`). Every route needs a session unless it's marked `@AllowAnonymous()`.

## Rate limits

60 requests a minute per client by default. Tighter where a request sends an email or is public: resending a tracking link or an invitation 5 a minute, the tracking page 30 a minute, and the sign-in code 10 a minute (Better Auth's own limiter). `/health` isn't limited.

## Caching

Responses set no caching headers by default, and none is meant to be cached. Two set their own: the catalogue is `public, max-age=300`, it only changes with a deploy, and the tracking page is `no-store`, it's one Customer's Ticket.

## Changing the API

A controller or DTO change regenerates `api/openapi.json` (`pnpm --filter @readyyet/api run openapi`), and the diff shows up in the PR. CI fails if the file is stale, and the e2e suite checks every response against it. Whether a change may break the web app, and how, is ADR 0020.
