-- CreateTable
CREATE TABLE "TellerBreak" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tellerId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "TellerBreak_tellerId_fkey" FOREIGN KEY ("tellerId") REFERENCES "Teller" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
