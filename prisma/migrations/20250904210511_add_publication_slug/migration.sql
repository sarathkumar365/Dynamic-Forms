/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Publication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicationId,slug]` on the table `ShareLink` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "ShareLink" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Publication_slug_key" ON "Publication"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_publicationId_slug_key" ON "ShareLink"("publicationId", "slug");
