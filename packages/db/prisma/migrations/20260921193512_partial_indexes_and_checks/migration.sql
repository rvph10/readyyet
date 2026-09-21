-- Constraints Prisma's schema language cannot express.
-- See docs/architecture/data-model.md for the reasoning.

-- A workflow is either a business-type default template or a location's
-- custom workflow, never both, never neither.
ALTER TABLE "workflow"
  ADD CONSTRAINT "workflow_scope_xor"
  CHECK (("business_type_id" IS NOT NULL) <> ("location_id" IS NOT NULL));

-- Exactly one active default workflow per business type.
CREATE UNIQUE INDEX "workflow_one_active_default"
  ON "workflow" ("business_type_id")
  WHERE "location_id" IS NULL AND "is_active" = true;

-- Exactly one active custom workflow per location.
CREATE UNIQUE INDEX "workflow_one_active_custom"
  ON "workflow" ("location_id")
  WHERE "location_id" IS NOT NULL AND "is_active" = true;

-- Prevent duplicate concurrent pending invites to the same email at the
-- same location, while still allowing re-invites once one expires or is
-- revoked.
CREATE UNIQUE INDEX "invitation_one_pending_per_email"
  ON "invitation" ("location_id", lower("email"))
  WHERE "status" = 'PENDING';
