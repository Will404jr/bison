import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession, signSession, getSessionCookieName, getSessionMaxAge, resolveTellerBranchId } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getTellerSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { tillNumber, serviceId } = body as { tillNumber?: number; serviceId?: string };
    if (typeof tillNumber !== "number" || tillNumber < 1) {
      return NextResponse.json(
        { error: "Valid till number is required" },
        { status: 400 }
      );
    }
    const serviceIdTrimmed = serviceId && typeof serviceId === "string" ? serviceId.trim() : "";
    if (!serviceIdTrimmed) {
      return NextResponse.json(
        { error: "Select a queue to serve" },
        { status: 400 }
      );
    }
    const teller = await prisma.teller.findUnique({
      where: { tillNumber },
    });
    if (!teller) {
      return NextResponse.json({ error: "Till not found" }, { status: 404 });
    }
    const service = await prisma.service.findUnique({ where: { id: serviceIdTrimmed } });
    if (!service) {
      return NextResponse.json({ error: "Queue not found" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { branchId: true },
    });
    if (!user?.branchId) {
      return NextResponse.json(
        { error: "User is not assigned to a branch. Contact an administrator." },
        { status: 400 }
      );
    }
    await prisma.$transaction([
      prisma.teller.updateMany({
        where: { userId: session.userId, id: { not: teller.id } },
        data: { userId: null, serviceId: null },
      }),
      prisma.teller.update({
        where: { id: teller.id },
        data: { userId: session.userId, serviceId: serviceIdTrimmed },
      }),
    ]);
    const token = signSession({
      userId: session.userId,
      tellerId: teller.id,
      tillNumber: teller.tillNumber,
      serviceId: serviceIdTrimmed,
      branchId: user.branchId,
    });
    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: getSessionMaxAge(),
      path: "/",
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getTellerSession();
  if (!session?.tellerId || session.tillNumber == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { serviceId } = body as { serviceId?: string };
    const serviceIdTrimmed = serviceId != null && typeof serviceId === "string" ? serviceId.trim() : "";
    if (!serviceIdTrimmed) {
      return NextResponse.json({ error: "Select a queue to serve" }, { status: 400 });
    }
    const service = await prisma.service.findUnique({ where: { id: serviceIdTrimmed } });
    if (!service) {
      return NextResponse.json({ error: "Queue not found" }, { status: 400 });
    }
    await prisma.teller.update({
      where: { id: session.tellerId },
      data: { serviceId: serviceIdTrimmed },
    });
    const branchId = await resolveTellerBranchId(session);
    let userId = session.userId;
    if (!userId) {
      const teller = await prisma.teller.findUnique({
        where: { id: session.tellerId },
        select: { userId: true },
      });
      userId = teller?.userId ?? undefined;
    }
    const token = signSession({
      userId,
      tellerId: session.tellerId,
      tillNumber: session.tillNumber,
      serviceId: serviceIdTrimmed,
      branchId: branchId ?? undefined,
    });
    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: getSessionMaxAge(),
      path: "/",
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update queue" }, { status: 500 });
  }
}
