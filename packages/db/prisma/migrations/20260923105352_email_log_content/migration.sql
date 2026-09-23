/*
  Warnings:

  - Added the required column `subject` to the `email_log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "email_log" ADD COLUMN     "html" TEXT,
ADD COLUMN     "subject" TEXT NOT NULL,
ADD COLUMN     "text" TEXT;
