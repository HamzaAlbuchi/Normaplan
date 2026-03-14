-- AlterTable: Add review workflow fields to RuleViolation
ALTER TABLE "RuleViolation" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'open',
ADD COLUMN "reason" TEXT,
ADD COLUMN "comment" TEXT,
ADD COLUMN "decidedByUserId" TEXT,
ADD COLUMN "decidedAt" TIMESTAMP(3);

-- CreateTable: ViolationReview for audit trail
CREATE TABLE "ViolationReview" (
    "id" TEXT NOT NULL,
    "violationId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViolationReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ViolationReview_violationId_idx" ON "ViolationReview"("violationId");

-- AddForeignKey
ALTER TABLE "RuleViolation" ADD CONSTRAINT "RuleViolation_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ViolationReview" ADD CONSTRAINT "ViolationReview_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "RuleViolation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViolationReview" ADD CONSTRAINT "ViolationReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
