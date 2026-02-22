/*
  Warnings:

  - Added the required column `ticketDay` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketDay" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "queueLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "calledAt" DATETIME,
    "completedAt" DATETIME,
    "servedByTellerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ticket_servedByTellerId_fkey" FOREIGN KEY ("servedByTellerId") REFERENCES "Teller" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("callCount", "calledAt", "completedAt", "createdAt", "id", "queueLabel", "servedByTellerId", "status", "ticketDay", "ticketNumber") SELECT "callCount", "calledAt", "completedAt", "createdAt", "id", "queueLabel", "servedByTellerId", "status", date("createdAt", 'localtime'), "ticketNumber" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE UNIQUE INDEX "Ticket_ticketDay_ticketNumber_key" ON "Ticket"("ticketDay", "ticketNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
