# 0026: Ticket photos and profile pictures

Date: 2026-09-24

## Decision

### What can have pictures

- A Ticket has up to 5 photos.
- A Location has a logo. It replaces today's `logoUrl`, which staff type in as a link, with an upload.
- A User has an avatar, stored in Better Auth's existing `User.image`.

A Business has no picture: customers only ever see a Location.

### Storage

Files live in a Railway Bucket (S3-compatible, private), one per environment, declared in the Railway IaC file (ADR 0022). Postgres stores only each file's object key, never the file or a URL. The API talks to the bucket with the AWS S3 client.

Staging is public and anyone can sign up there, so its bucket holds throwaway data only and may be emptied at any time.

### Upload and compression

Every upload goes through the API, never straight from the browser to the bucket. The API:

- accepts JPEG, PNG or WebP, up to 15 MB, and checks the real content, not the declared type,
- decodes and re-encodes it with `sharp`, which also drops all metadata, EXIF GPS position included,
- resizes it: a Ticket photo to at most 1600px on its long side, as WebP, an avatar to 256px square, as WebP, a logo to fit in 512px, as PNG,
- stores it under a new random key, so a replaced picture always gets a new URL.

Upload routes are limited to 5 per minute per client (`@Throttle`, keyed on the client IP, ADR 0025), like invitations.

The web app's file input doesn't list HEIC, so iPhones convert their photos to JPEG before uploading.

### Ticket photos

- Any member of the Location can add a photo while the Ticket's tracking link is still valid. A sixth one is rejected.
- An Employee can delete their own photos, an Owner or Admin any of them.
- Every photo is shown to the Customer on the tracking page. `GET /tracking/:code` returns them alongside the Status history, extending ADR 0013's explicit list.
- Staff and the tracking page get photos as presigned bucket URLs valid for 15 minutes, created per request.

### Logos and avatars

A logo appears in customer emails, which are read days later, longer than a presigned URL lives. So logos and avatars are served by a public API route that streams the object from the bucket with a one-year immutable cache header. The random key is what makes the URL unguessable, and a new key per upload means a cached image is never stale.

### Deletion

- A Ticket's photos are deleted when its tracking link expires, 30 days after it reaches `COMPLETED`, `CANCELLED` or `REJECTED` (ADR 0013). A sweep, like the existing cron jobs, finds them and deletes the objects then the rows. A Ticket reopened later has no photos left.
- Deleting a Location deletes its Tickets' photos and its logo at once, its tracking links stop answering then (ADR 0017).
- Erasing a Customer deletes the photos of their Tickets.
- Deleting a staff account deletes the avatar (ADR 0018). Photos the User took stay, they belong to the Ticket.
- Replacing a logo or avatar deletes the previous object.

The row goes first and the object after, so a failure leaves an unused file in the bucket, never a row pointing at nothing. The sweep also removes objects no row points to.

## Why

A Railway volume attaches to one service, so the API could never run a second replica, and serving and backing up the files would be ours to build. A bucket has none of those limits, lives in the same Railway project, and serving from it costs nothing (Railway doesn't bill bucket egress). Its S3 API means moving to R2 or S3 later is a configuration change.

Uploading through the API instead of presigned uploads is one more hop, but only the API can guarantee what's stored: that it's really an image, small, and stripped of the GPS position a phone writes into every photo, which could be an employee's home. At 5 photos per Ticket the traffic is small. Re-encoding a 3 to 5 MB phone photo to 1600px WebP gives about 200 KB, still sharp enough to show a scratch. Logos are PNG because some email clients, Outlook desktop among them, don't display WebP.

Ticket photos exist to show the Customer the item's condition and progress, so they share the tracking link's lifetime: once the Customer can't open the link, no one outside the shop needs them. Photos can show personal data (a number plate, a face, an address on a parcel), and tying them to the link gives them a short, predictable life without a separate retention setting. The trade-off is accepted: a dispute raised more than 30 days after the Ticket closes has no photos to settle it.

Uploads are the heaviest requests the API takes, up to 15 MB each. The default limit of 60 per minute would let one client push about 900 MB a minute through the API and into the bucket, 5 per minute is still more than staff adding photos to a Ticket need.

Only the author, an Owner or an Admin can delete a photo, so a drop-off photo can't disappear quietly when there's a disagreement about damage.
