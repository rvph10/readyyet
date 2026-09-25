# 0038: How photos, logos and avatars are stored, served and cleaned up

Date: 2026-09-25

Implements ADR 0026, and settles the points it leaves open.

## Decision

### Uploads

- An upload request carries the image as its only part. Any other file or text field is refused with a 400: Multer's limits on those default to unlimited, and it keeps every text field in memory, up to 1 MB each.
- An image over 50 million pixels is refused with a 400, whatever its file size. The count is read from the file's header before anything is decoded.
- The EXIF orientation is applied to the pixels before the metadata is dropped, so a phone photo taken sideways stays upright.
- A Location's logo is uploaded by an Owner or an Admin, the same people who edit its other settings. `PATCH /locations/:id` no longer takes `logoUrl`, the response still returns it, now built from the stored key.
- Photos can be added to a frozen Location's Tickets: its existing Tickets keep working (ADR 0031). They can be added to an ended Ticket too, until its tracking link expires, then the request answers 409.
- An upload writes the object, then the row. If the row can't be written, the object is deleted before the error is returned.

### Serving

- `GET /images/:prefix/:file` serves only the `logos/` and `avatars/` prefixes, and only a file name the API could have generated (a UUID and `.png` or `.webp`). A Ticket photo is never served there, even by its exact key: photos are only reachable through a presigned URL.
- That route answers `Cross-Origin-Resource-Policy: cross-origin`, overriding helmet's `same-origin`, so the web app and webmail on other origins can show the image. It isn't rate limited. A 404 is `no-store`, so a missing image isn't cached for a year.

### Better Auth's avatar field

Better Auth's own `POST /api/auth/update-user` route accepts an `image` string. A `databaseHooks.user.update.before` hook sets it to `undefined`, so that route can still change the name but never the avatar. Only `PUT /me/avatar` sets it, writing through Prisma after the image is checked.

### What the migration drops

The logo links typed into `location.logo_url` aren't copied into the bucket, and `user.image` is emptied. Staging's data is throwaway, production has no Location yet, and only Better Auth's update route could have set an image, to any string.

### Cleaning up

- Deleting an object once its row is gone never fails the request: an error is logged, and the orphan sweep deletes the object later.
- `ticket-photo-expiry` runs every hour. It deletes the photos of Tickets whose tracking link has expired, using the same rule as the tracking page.
- `orphan-images` runs every day at 3:00. It lists the bucket and deletes every object that no Ticket photo, logo or avatar points to. It skips objects less than a day old, since that may be an upload whose row isn't written yet. The bucket must therefore hold nothing but these pictures.

### Local development and CI

- Locally and in CI, the bucket is Adobe's S3Mock (`adobe/s3mock`, pinned), in `docker-compose.yml` and as a service of the CI `api` job. The tests upload, presign, stream and delete against it, not against a fake client.
- The S3 client uses path-style URLs, because S3Mock only answers those.
- The S3 client only sends checksums when an operation requires them. By default the SDK sends checksum headers that are an AWS extension, and not every S3-compatible store accepts them.

## Why

A small compressed file can decode to a huge image. Without a pixel limit, one 15 MB upload could make `sharp` allocate gigabytes. 50 million pixels still covers a 48 MP phone photo.

Serving only a key format the API generates means a crafted path (`..`, an encoded slash) never reaches the bucket. Checking the prefix keeps the public route from becoming a way around presigned URLs for photos.

A page can show a whole team's avatars at once, and a webmail's image proxy fetches images for all its users from a few addresses. A per-client limit would refuse them, and the one-year cache already keeps repeat requests away.

Better Auth has no option to make `image` read-only. Disabling `update-user` altogether would also remove the only way to change a User's name.

MinIO, the usual local S3 server, no longer publishes free Docker images. S3Mock is maintained, runs as one container with no configuration file, and creates the bucket at startup.
