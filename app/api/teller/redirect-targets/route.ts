import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession, resolveTellerBranchId } from "@/lib/auth";

/** Other staffed tills at the same branch available for redirecting the current ticket. */
export async function GET() {
  const session = await getTellerSession();
  if (!session?.tellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branchId = await resolveTellerBranchId(session);
  if (!branchId) {
    return NextResponse.json({ error: "User is not assigned to a branch" }, { status: 403 });
  }
  const tellers = await prisma.teller.findMany({
    where: {
      id: { not: session.tellerId },
      userId: { not: null },
    },
    orderBy: { tillNumber: "asc" },
    select: { id: true, tillNumber: true, name: true, userId: true },
  });
  const userIds = tellers.map((t) => t.userId).filter((id): id is string => !!id);
  const sameBranchUsers = await prisma.user.findMany({
    where: { id: { in: userIds }, branchId },
    select: { id: true },
  });
  const allowedUserIds = new Set(sameBranchUsers.map((u) => u.id));
  return NextResponse.json({
    targets: tellers
      .filter((t) => t.userId && allowedUserIds.has(t.userId))
      .map((t) => ({
        id: t.id,
        tillNumber: t.tillNumber,
        name: t.name,
      })),
  });
}
