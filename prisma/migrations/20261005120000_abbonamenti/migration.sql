-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('MENSILE', 'TRIMESTRALE', 'ANNUALE', 'CARNET');

-- AlterTable
-- il vecchio prezzo unico diventa il prezzo mensile
ALTER TABLE "Course" RENAME COLUMN "price" TO "priceMonthly";

ALTER TABLE "Course" ADD COLUMN     "priceCarnet" DECIMAL(10,2),
ADD COLUMN     "priceQuarterly" DECIMAL(10,2),
ADD COLUMN     "priceYearly" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "type" "SubscriptionType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "entries" INTEGER,
    "price" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_enrollmentId_startDate_idx" ON "Subscription"("enrollmentId", "startDate");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

