import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tellers = await prisma.teller.findMany({
    select: { tillNumber: true },
    orderBy: { tillNumber: "asc" },
  });
  const tills = tellers.map((t) => t.tillNumber);
  if (tills.length === 0) {
    return NextResponse.json({ tills: [1, 2, 3] });
  }
  return NextResponse.json({ tills });
}
