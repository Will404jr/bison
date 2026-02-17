import { PrismaClient } from "@prisma/client";
import { hashPin, hashPassword } from "../lib/auth";

const prisma = new PrismaClient();

const SEED_TELLER_EMAIL = "teller@example.com";
const SEED_TELLER_USERNAME = "teller";
const SEED_TELLER_PASSWORD = "teller123";

const DEFAULT_SERVICES = [
  { name: "Withdrawals", slug: "withdrawals", description: "Cash withdrawals" },
  { name: "Deposits", slug: "deposits", description: "Cash and check deposits" },
  { name: "Inquiries", slug: "inquiries", description: "Account inquiries and general questions" },
];

async function main() {
  // Only clear ticket data so existing queues and tellers are preserved
  await prisma.ticketTransaction.deleteMany();
  await prisma.ticket.deleteMany();

  const tellerPasswordHash = await hashPassword(SEED_TELLER_PASSWORD);
  await prisma.user.upsert({
    where: { email: SEED_TELLER_EMAIL },
    create: {
      email: SEED_TELLER_EMAIL,
      username: SEED_TELLER_USERNAME,
      passwordHash: tellerPasswordHash,
      active: true,
    },
    update: { passwordHash: tellerPasswordHash, active: true },
  });

  // Only add default services when the database has no services (fresh install)
  const existingServiceCount = await prisma.service.count();
  if (existingServiceCount === 0) {
    await prisma.service.createMany({ data: DEFAULT_SERVICES });
  }

  // Only add default tellers when the database has no tellers
  const existingTellerCount = await prisma.teller.count();
  if (existingTellerCount === 0) {
    const pinHash = await hashPin("1234");
    await prisma.teller.createMany({
      data: [
        { tillNumber: 1, pinHash, name: "Till 1" },
        { tillNumber: 2, pinHash, name: "Till 2" },
        { tillNumber: 3, pinHash, name: "Till 3" },
      ],
    });
  }

  console.log(
    "Seed complete: 1 user (teller@example.com / teller123). Services and tellers only added when empty."
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
