import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession } from "@/lib/auth";

/** Other tills available for redirecting the current ticket. */
export async function GET() {
  const session = await getTellerSession();
  if (!session?.tellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tellers = await prisma.teller.findMany({
    where: { id: { not: session.tellerId } },
    orderBy: { tillNumber: "asc" },
    select: { id: true, tillNumber: true, name: true },
  });
  return NextResponse.json({
    targets: tellers.map((t) => ({
      id: t.id,
      tillNumber: t.tillNumber,
      name: t.name,
    })),
  });
}
