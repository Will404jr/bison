import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      location: true,
      username: true,
      active: true,
      createdAt: true,
    },
  });
  return NextResponse.json(branches);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, location, username, password } = body as {
      name?: string;
      location?: string;
      username?: string;
      password?: string;
    };
    if (
      !name ||
      typeof name !== "string" ||
      !location ||
      typeof location !== "string" ||
      !username ||
      typeof username !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { error: "name, location, username and password are required" },
        { status: 400 }
      );
    }
    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedName || !trimmedLocation || !trimmedUsername || trimmedPassword.length < 6) {
      return NextResponse.json(
        { error: "Invalid fields (password min 6 characters)" },
        { status: 400 }
      );
    }
    const existing = await prisma.branch.findFirst({
      where: { username: trimmedUsername },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A branch with this username already exists" },
        { status: 409 }
      );
    }
    const passwordHash = await hashPassword(trimmedPassword);
    const branch = await prisma.branch.create({
      data: {
        name: trimmedName,
        location: trimmedLocation,
        username: trimmedUsername,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        location: true,
        username: true,
        active: true,
        createdAt: true,
      },
    });
    return NextResponse.json(branch);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 });
  }
}
