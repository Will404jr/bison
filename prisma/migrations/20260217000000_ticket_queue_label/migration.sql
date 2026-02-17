-- Replace Ticket.serviceId with Ticket.queueLabel ("Category Name - Service Name")
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

INSERT INTO "new_Ticket" ("id", "ticketNumber", "queueLabel", "status", "callCount", "calledAt", "completedAt", "servedByTellerId", "createdAt")
SELECT
    t."id",
    t."ticketNumber",
    COALESCE(c."name", 'Other') || ' - ' || s."name",
    t."status",
    t."callCount",
    t."calledAt",
    t."completedAt",
    t."servedByTellerId",
    t."createdAt"
FROM "Ticket" t
JOIN "Service" s ON s."id" = t."serviceId"
LEFT JOIN "Category" c ON c."id" = s."categoryId";

DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";

CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

PRAGMA foreign_keys=ON;
