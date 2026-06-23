import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBranchSession } from "@/lib/auth";

export async function GET() {
  const session = await getBranchSession();
  if (!session?.branchId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branch = await prisma.branch.findUnique({
    where: { id: session.branchId },
    select: { id: true, name: true, location: true, active: true },
  });
  if (!branch || !branch.active) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    branchId: branch.id,
    name: branch.name,
    location: branch.location,
  });
}
