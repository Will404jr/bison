import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession, resolveTellerBranchId } from "@/lib/auth";

export async function GET() {
  const session = await getTellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branchId = await resolveTellerBranchId(session);
  let branchName: string | null = null;
  if (branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { name: true },
    });
    branchName = branch?.name ?? null;
  }
  if (session.tellerId != null && session.tillNumber != null) {
    return NextResponse.json({
      needsSetup: false,
      tellerId: session.tellerId,
      tillNumber: session.tillNumber,
      serviceId: session.serviceId ?? null,
      branchId: branchId ?? null,
      branchName,
    });
  }
  return NextResponse.json({
    needsSetup: true,
    userId: session.userId,
    branchId: branchId ?? null,
    branchName,
  });
}
