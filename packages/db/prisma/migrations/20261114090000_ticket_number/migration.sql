-- ADR 0154: Tickets numbered 1, 2, 3 per Location, existing ones in the order
-- they were created.
ALTER TABLE "location" ADD COLUMN "ticket_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ticket" ADD COLUMN "number" INTEGER;

UPDATE "ticket" SET "number" = numbered.n
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "location_id" ORDER BY "created_at", "id") AS n
  FROM "ticket"
) AS numbered
WHERE "ticket"."id" = numbered."id";

UPDATE "location" SET "ticket_count" = counted.total
FROM (SELECT "location_id", COUNT(*) AS total FROM "ticket" GROUP BY "location_id") AS counted
WHERE "location"."id" = counted."location_id";

-- The number is given here rather than by the app: the Location's row lock
-- keeps two Tickets created at once from taking the same one, and the API
-- still running during a deploy inserts without knowing the column.
CREATE FUNCTION "assign_ticket_number"() RETURNS trigger AS $$
BEGIN
  UPDATE "location" SET "ticket_count" = "ticket_count" + 1
  WHERE "id" = NEW."location_id"
  RETURNING "ticket_count" INTO NEW."number";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ticket_number"
BEFORE INSERT ON "ticket"
FOR EACH ROW EXECUTE FUNCTION "assign_ticket_number"();

ALTER TABLE "ticket" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "ticket_location_id_number_key" ON "ticket"("location_id", "number");
