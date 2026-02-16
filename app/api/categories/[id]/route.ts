import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, sortOrder } = body as { name?: string; sortOrder?: number };
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    const updates: { name?: string; sortOrder?: number } = {};
    if (name !== undefined && typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }
    if (typeof sortOrder === "number") {
      updates.sortOrder = sortOrder;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(category);
    }
    const updated = await prisma.category.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { services: { take: 1 } },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    if (category.services.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a category that has queues. Move or delete the queues first.",
        },
        { status: 400 }
      );
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
