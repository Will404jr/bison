import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, location, username, password, active } = body as {
      name?: string;
      location?: string;
      username?: string;
      password?: string;
      active?: boolean;
    };
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    const updates: {
      name?: string;
      location?: string;
      username?: string;
      passwordHash?: string;
      active?: boolean;
    } = {};
    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updates.name = trimmed;
    }
    if (location !== undefined) {
      const trimmed = location.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Location cannot be empty" }, { status: 400 });
      }
      updates.location = trimmed;
    }
    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
      }
      const existing = await prisma.branch.findFirst({
        where: { username: trimmed, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A branch with this username already exists" },
          { status: 409 }
        );
      }
      updates.username = trimmed;
    }
    if (password !== undefined && password !== "") {
      const trimmedPassword = password.trim();
      if (trimmedPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updates.passwordHash = await hashPassword(trimmedPassword);
    }
    if (active !== undefined && typeof active === "boolean") {
      updates.active = active;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        id: branch.id,
        name: branch.name,
        location: branch.location,
        username: branch.username,
        active: branch.active,
        createdAt: branch.createdAt,
      });
    }
    const updated = await prisma.branch.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        location: true,
        username: true,
        active: true,
        createdAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update branch" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    await prisma.branch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete branch" }, { status: 500 });
  }
}
