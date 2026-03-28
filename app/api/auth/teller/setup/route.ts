import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession, signSession, getSessionCookieName, getSessionMaxAge } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getTellerSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { tillNumber, categoryId } = body as { tillNumber?: number; categoryId?: string };
    if (typeof tillNumber !== "number" || tillNumber < 1) {
      return NextResponse.json(
        { error: "Valid till number is required" },
        { status: 400 }
      );
    }
    const teller = await prisma.teller.findUnique({
      where: { tillNumber },
    });
    if (!teller) {
      return NextResponse.json({ error: "Till not found" }, { status: 404 });
    }
    const categoryIdTrimmed = categoryId && typeof categoryId === "string" ? categoryId.trim() || null : null;
    if (categoryIdTrimmed) {
      const cat = await prisma.category.findUnique({ where: { id: categoryIdTrimmed } });
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
      }
    }
    await prisma.$transaction([
      prisma.teller.updateMany({
        where: { userId: session.userId, id: { not: teller.id } },
        data: { userId: null, categoryId: null },
      }),
      prisma.teller.update({
        where: { id: teller.id },
        data: { userId: session.userId, categoryId: categoryIdTrimmed },
      }),
    ]);
    const token = signSession({
      tellerId: teller.id,
      tillNumber: teller.tillNumber,
      categoryId: categoryIdTrimmed ?? undefined,
    });
    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
    const { categoryId } = body as { categoryId?: string };
    const categoryIdTrimmed = categoryId != null && typeof categoryId === "string" ? categoryId.trim() || null : null;
    if (categoryIdTrimmed) {
      const cat = await prisma.category.findUnique({ where: { id: categoryIdTrimmed } });
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
      }
    }
    await prisma.teller.update({
      where: { id: session.tellerId },
      data: { categoryId: categoryIdTrimmed },
    });
    const token = signSession({
      tellerId: session.tellerId,
      tillNumber: session.tillNumber,
      categoryId: categoryIdTrimmed ?? undefined,
    });
    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getSessionMaxAge(),
      path: "/",
    });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}
