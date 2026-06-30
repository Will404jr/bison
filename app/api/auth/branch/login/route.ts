import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  signBranchSession,
  getBranchSessionCookieName,
  getBranchSessionMaxAge,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body as { username?: string; password?: string };
    if (typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }
    const usernameTrimmed = username.trim();
    const passwordTrimmed = password.trim();
    const branches = await prisma.branch.findMany({
      where: { active: true },
      select: { id: true, username: true, passwordHash: true },
    });
    const branch = branches.find(
      (b) => b.username.toLowerCase() === usernameTrimmed.toLowerCase()
    );
    if (!branch) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }
    if (!branch.passwordHash || !branch.passwordHash.includes(":")) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }
    const valid = await verifyPassword(passwordTrimmed, branch.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }
    const token = signBranchSession({ branchId: branch.id });
    const response = NextResponse.json({ success: true });
    response.cookies.set(getBranchSessionCookieName(), token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: getBranchSessionMaxAge(),
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
