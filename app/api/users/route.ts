import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, username: true, active: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, username, password } = body as {
      email?: string;
      username?: string;
      password?: string;
    };
    if (
      !email ||
      typeof email !== "string" ||
      !username ||
      typeof username !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { error: "email, username and password are required" },
        { status: 400 }
      );
    }
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedUsername || trimmedPassword.length < 6) {
      return NextResponse.json(
        { error: "Invalid email, username or password (min 6 characters)" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedEmail },
          { username: trimmedUsername },
        ],
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
      },
      select: { id: true, email: true, username: true, active: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
