import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, getSessionCookieName, getSessionMaxAge } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailOrUsername, password } = body as { emailOrUsername?: string; password?: string };
    if (typeof emailOrUsername !== "string" || !emailOrUsername.trim() || typeof password !== "string" || !password) {
      return NextResponse.json(
        { error: "Email/username and password are required" },
        { status: 400 }
      );
    }
    const term = emailOrUsername.trim().toLowerCase();
    const usernameTrimmed = emailOrUsername.trim();
    const passwordTrimmed = typeof password === "string" ? password.trim() : "";
    if (!passwordTrimmed) {
      return NextResponse.json(
        { error: "Email/username and password are required" },
        { status: 400 }
      );
    }
    // Match email (case-insensitive) or username (case-insensitive); only active users
    const activeUsers = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, email: true, username: true, passwordHash: true },
    });
    const user = activeUsers.find(
      (u) =>
        (u.email?.toLowerCase() ?? "") === term ||
        (u.username?.toLowerCase() ?? "") === usernameTrimmed.toLowerCase()
    );
    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email/username or password",
          ...(process.env.NODE_ENV === "development" && { _hint: "No active user matched this email or username" }),
        },
        { status: 401 }
      );
    }
    if (!user.passwordHash || !user.passwordHash.includes(":")) {
      return NextResponse.json(
        {
          error: "Invalid email/username or password",
          ...(process.env.NODE_ENV === "development" && { _hint: "User has invalid password hash (re-set password in Dashboard)" }),
        },
        { status: 401 }
      );
    }
    const valid = await verifyPassword(passwordTrimmed, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        {
          error: "Invalid email/username or password",
          ...(process.env.NODE_ENV === "development" && { _hint: "Password did not match" }),
        },
        { status: 401 }
      );
    }
    const token = signSession({ userId: user.id });
    const response = NextResponse.json({ success: true, needsSetup: true });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getSessionMaxAge(),
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
