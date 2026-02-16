-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Teller" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tillNumber" INTEGER NOT NULL,
    "pinHash" TEXT,
    "name" TEXT,
    "userId" TEXT,
    "categoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Teller_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Teller" ("createdAt", "id", "name", "pinHash", "tillNumber") SELECT "createdAt", "id", "name", "pinHash", "tillNumber" FROM "Teller";
DROP TABLE "Teller";
ALTER TABLE "new_Teller" RENAME TO "Teller";
CREATE UNIQUE INDEX "Teller_tillNumber_key" ON "Teller"("tillNumber");
CREATE UNIQUE INDEX "Teller_userId_key" ON "Teller"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
