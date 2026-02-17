import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, description, categoryId } = body as {
      name?: string;
      description?: string;
      categoryId?: string | null;
    };
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    const updates: { name?: string; description?: string | null; categoryId?: string | null } = {};
    if (name !== undefined && typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }
    if (description !== undefined) {
      updates.description =
        typeof description === "string" && description.trim() ? description.trim() : null;
    }
    if (categoryId !== undefined) {
      updates.categoryId =
        categoryId && typeof categoryId === "string" && categoryId.trim()
          ? categoryId.trim()
          : null;
      if (updates.categoryId) {
        const cat = await prisma.category.findUnique({
          where: { id: updates.categoryId },
        });
        if (!cat) {
          return NextResponse.json({ error: "Category not found" }, { status: 400 });
        }
      }
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(service);
    }
    const updated = await prisma.service.update({
      where: { id },
      data: updates,
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update service" },
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
    const service = await prisma.service.findUnique({
      where: { id },
      include: { category: { select: { name: true } } },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    const queueLabel =
      (service.category?.name ?? "Other") + " - " + service.name;
    const ticketCount = await prisma.ticket.count({
      where: { queueLabel },
    });
    if (ticketCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: this queue has ${ticketCount} ticket(s). Remove or reassign them first.`,
        },
        { status: 400 }
      );
    }
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}
