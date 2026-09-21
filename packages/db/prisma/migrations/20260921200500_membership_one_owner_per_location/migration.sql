-- At most one OWNER membership per location. This is only half of the
-- invariant in docs/decisions/0002-location-scoped-membership.md ("exactly
-- one owner per business, implicit on every location"); the "exactly one,
-- always" half requires the location-creation transaction to exist, which
-- it doesn't yet (no application code). See docs/architecture/data-model.md.
CREATE UNIQUE INDEX "membership_one_owner_per_location"
  ON "membership" ("location_id")
  WHERE "role" = 'OWNER';
