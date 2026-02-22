import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

async function getOrCreateSettings() {
  let row = await prisma.appSettings.findFirst();
  if (!row) {
    row = await prisma.appSettings.create({
      data: {},
    });
  }
  return row;
}

/** GET current app settings. Password is never returned. */
export async function GET() {
  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json({
      apiKey: settings.apiKey ?? "",
      apiUrl: settings.apiUrl ?? "",
      adminUsername: settings.adminUsername ?? "",
      hasAdminPassword: !!settings.adminPasswordHash,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

/** PATCH update app settings. Send only fields to update. */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      apiKey,
      apiUrl,
      adminUsername,
      adminPassword,
    } = body as {
      apiKey?: string;
      apiUrl?: string;
      adminUsername?: string;
      adminPassword?: string;
    };

    const settings = await getOrCreateSettings();
    const updates: {
      apiKey?: string | null;
      apiUrl?: string | null;
      adminUsername?: string | null;
      adminPasswordHash?: string | null;
    } = {};

    if (apiKey !== undefined) {
      updates.apiKey =
        typeof apiKey === "string" ? apiKey.trim() || null : settings.apiKey;
    }
    if (apiUrl !== undefined) {
      updates.apiUrl =
        typeof apiUrl === "string" ? apiUrl.trim() || null : settings.apiUrl;
    }
    if (adminUsername !== undefined) {
      updates.adminUsername =
        typeof adminUsername === "string"
          ? adminUsername.trim() || null
          : settings.adminUsername;
    }
    if (adminPassword !== undefined && adminPassword !== "") {
      const trimmed = typeof adminPassword === "string" ? adminPassword.trim() : "";
      if (trimmed.length >= 6) {
        updates.adminPasswordHash = await hashPassword(trimmed);
      }
    }

    const updated = await prisma.appSettings.update({
      where: { id: settings.id },
      data: updates,
    });

    return NextResponse.json({
      apiKey: updated.apiKey ?? "",
      apiUrl: updated.apiUrl ?? "",
      adminUsername: updated.adminUsername ?? "",
      hasAdminPassword: !!updated.adminPasswordHash,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
