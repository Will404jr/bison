import { NextResponse } from "next/server";
import { getTellerSession } from "@/lib/auth";

export async function GET() {
  const session = await getTellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.tellerId != null && session.tillNumber != null) {
    return NextResponse.json({
      needsSetup: false,
      tellerId: session.tellerId,
      tillNumber: session.tillNumber,
      categoryId: session.categoryId ?? null,
    });
  }
  return NextResponse.json({
    needsSetup: true,
    userId: session.userId,
  });
}
