import { PrismaClient } from "@prisma/client";
import { hashPin, hashPassword } from "../lib/auth";

const prisma = new PrismaClient();

const SEED_TELLER_EMAIL = "teller@example.com";
const SEED_TELLER_USERNAME = "teller";
const SEED_TELLER_PASSWORD = "teller123";

async function main() {
  await prisma.ticketTransaction.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.service.deleteMany();
  await prisma.teller.deleteMany();

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

  await prisma.service.createMany({
    data: [
      { name: "Withdrawals", slug: "withdrawals", description: "Cash withdrawals" },
      { name: "Deposits", slug: "deposits", description: "Cash and check deposits" },
      { name: "Inquiries", slug: "inquiries", description: "Account inquiries and general questions" },
    ],
  });

  const pinHash = await hashPin("1234");
  await prisma.teller.createMany({
    data: [
      { tillNumber: 1, pinHash, name: "Till 1" },
      { tillNumber: 2, pinHash, name: "Till 2" },
      { tillNumber: 3, pinHash, name: "Till 3" },
    ],
  });

  console.log("Seed complete: 1 user (teller@example.com / teller123), 3 services, 3 tellers (PIN 1234 for all)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
