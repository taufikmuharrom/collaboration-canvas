/*
  Warnings:

  - You are about to drop the column `source` on the `edges` table. All the data in the column will be lost.
  - You are about to drop the column `target` on the `edges` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `edges` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `nodes` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `nodes` table. All the data in the column will be lost.
  - Added the required column `sourceId` to the `edges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetId` to the `edges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `positionX` to the `nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `positionY` to the `nodes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."edges" DROP CONSTRAINT "edges_source_fkey";

-- DropForeignKey
ALTER TABLE "public"."edges" DROP CONSTRAINT "edges_target_fkey";

-- AlterTable
ALTER TABLE "edges" DROP COLUMN "source",
DROP COLUMN "target",
DROP COLUMN "type",
ADD COLUMN     "sourceId" TEXT NOT NULL,
ADD COLUMN     "targetId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "nodes" DROP COLUMN "position",
DROP COLUMN "type",
ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "positionX" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "positionY" DOUBLE PRECISION NOT NULL;

-- AddForeignKey
ALTER TABLE "edges" ADD CONSTRAINT "edges_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edges" ADD CONSTRAINT "edges_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
