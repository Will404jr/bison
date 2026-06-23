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

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username, password, branchId } = body as {
      email?: string;
      username?: string;
      password?: string;
      branchId?: string;
    };
    if (
      !email ||
      typeof email !== "string" ||
      !username ||
      typeof username !== "string" ||
      !password ||
      typeof password !== "string" ||
      !branchId ||
      typeof branchId !== "string"
    ) {
      return NextResponse.json(
        { error: "email, username, password and branchId are required" },
        { status: 400 }
      );
    }
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedBranchId = branchId.trim();
    if (!trimmedEmail || !trimmedUsername || trimmedPassword.length < 6 || !trimmedBranchId) {
      return NextResponse.json(
        { error: "Invalid email, username, password (min 6 characters) or branch" },
        { status: 400 }
      );
    }
    const branchError = await validateBranchId(trimmedBranchId);
    if (branchError) {
      return NextResponse.json({ error: branchError.error }, { status: branchError.status });
    }
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: trimmedEmail }, { username: trimmedUsername }],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email or username already exists" },
        { status: 409 }
      );
    }
    const passwordHash = await hashPassword(trimmedPassword);
    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        username: trimmedUsername,
        passwordHash,
        branchId: trimmedBranchId,
      },
      select: userSelect,
    });
    return NextResponse.json(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
