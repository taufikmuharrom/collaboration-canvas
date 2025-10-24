/*
  Warnings:

  - You are about to drop the column `sourceId` on the `edges` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `edges` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `nodes` table. All the data in the column will be lost.
  - You are about to drop the column `positionX` on the `nodes` table. All the data in the column will be lost.
  - You are about to drop the column `positionY` on the `nodes` table. All the data in the column will be lost.
  - Added the required column `source` to the `edges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `target` to the `edges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `nodes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."edges" DROP CONSTRAINT "edges_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."edges" DROP CONSTRAINT "edges_targetId_fkey";

-- AlterTable
ALTER TABLE "edges" DROP COLUMN "sourceId",
DROP COLUMN "targetId",
ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "target" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "nodes" DROP COLUMN "label",
DROP COLUMN "positionX",
DROP COLUMN "positionY",
ADD COLUMN     "position" JSONB NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'default';

-- AddForeignKey
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_fkey" FOREIGN KEY ("source") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_fkey" FOREIGN KEY ("target") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
