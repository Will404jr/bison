import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const userSelect = {
  id: true,
  email: true,
  username: true,
  active: true,
  branchId: true,
  createdAt: true,
  branch: { select: { id: true, name: true } },
} as const;

async function validateBranchId(branchId: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, active: true },
  });
  if (!branch) {
    return { error: "Branch not found", status: 404 as const };
  }
  if (!branch.active) {
    return { error: "Branch is inactive", status: 400 as const };
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { email, username, password, active, branchId } = body as {
      email?: string;
      username?: string;
      password?: string;
      active?: boolean;
      branchId?: string;
    };
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const updates: {
      email?: string;
      username?: string;
      passwordHash?: string;
      active?: boolean;
      branchId?: string;
    } = {};
    if (email !== undefined) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) {
        return NextResponse.json({ error: "Email cannot be empty" }, { status: 400 });
      }
      const existing = await prisma.user.findFirst({
        where: { email: trimmed, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }
      updates.email = trimmed;
    }
    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
      }
      const existing = await prisma.user.findFirst({
        where: { username: trimmed, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A user with this username already exists" },
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
    if (branchId !== undefined) {
      const trimmed = branchId.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Branch cannot be empty" }, { status: 400 });
      }
      const branchError = await validateBranchId(trimmed);
      if (branchError) {
        return NextResponse.json({ error: branchError.error }, { status: branchError.status });
      }
      updates.branchId = trimmed;
    }
    if (Object.keys(updates).length === 0) {
      const current = await prisma.user.findUnique({ where: { id }, select: userSelect });
      return NextResponse.json(current);
    }
    const updated = await prisma.user.update({
      where: { id },
      data: updates,
      select: userSelect,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
