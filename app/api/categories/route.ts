import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    include: {
      services: { orderBy: { name: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, sortOrder } = body as { name?: string; sortOrder?: number };
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
