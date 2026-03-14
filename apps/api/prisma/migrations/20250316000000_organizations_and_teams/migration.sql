-- CreateTable: Organization
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Membership
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");
CREATE INDEX "Membership_organizationId_idx" ON "Membership"("organizationId");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateTable: ProjectAssignment
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectAssignment_projectId_userId_key" ON "ProjectAssignment"("projectId", "userId");
CREATE INDEX "ProjectAssignment_userId_idx" ON "ProjectAssignment"("userId");

-- Add organizationId to Project (nullable for migration)
ALTER TABLE "Project" ADD COLUMN "organizationId" TEXT;

-- Data migration: create org per user with projects, add membership, update projects
DO $$
DECLARE
  rec RECORD;
  new_org_id TEXT;
BEGIN
  FOR rec IN 
    SELECT DISTINCT p."userId" as uid 
    FROM "Project" p
  LOOP
    new_org_id := gen_random_uuid()::text;
    INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
    SELECT new_org_id, COALESCE(u."name", split_part(u."email", '@', 1)) || ' Büro', NOW(), NOW()
    FROM "User" u WHERE u."id" = rec.uid;
    INSERT INTO "Membership" ("id", "userId", "organizationId", "role", "createdAt")
    VALUES (gen_random_uuid()::text, rec.uid, new_org_id, 'owner', NOW());
    UPDATE "Project" SET "organizationId" = new_org_id WHERE "userId" = rec.uid;
  END LOOP;
END $$;

-- Assign project owners as architects to their projects (so they retain access)
INSERT INTO "ProjectAssignment" ("id", "projectId", "userId", "createdAt")
SELECT gen_random_uuid()::text, p."id", p."userId", NOW()
FROM "Project" p
WHERE p."organizationId" IS NOT NULL AND p."userId" IS NOT NULL;

-- Make organizationId required
ALTER TABLE "Project" ALTER COLUMN "organizationId" SET NOT NULL;

-- Drop old userId FK and column
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";
ALTER TABLE "Project" DROP COLUMN "userId";

-- Add new FKs
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;