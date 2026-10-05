-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('DA_CONTATTARE', 'CONTATTATO', 'PROVA', 'ISCRITTO');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "contactStatus" "ContactStatus" NOT NULL DEFAULT 'ISCRITTO',
ADD COLUMN     "membershipForm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referent" TEXT;

