-- Backfill projects that have no zip/state (legacy data)
UPDATE "Project" SET "zipCode" = '10115', "state" = 'BE' WHERE "zipCode" IS NULL OR "state" IS NULL;

-- Make zipCode and state required
ALTER TABLE "Project" ALTER COLUMN "zipCode" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "state" SET NOT NULL;
