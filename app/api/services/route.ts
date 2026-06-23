import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body as {
      name?: string;
      description?: string;
    };
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }
    const baseSlug = slugify(name) || "service";
    let slug = baseSlug;
    let n = 0;
    while (await prisma.service.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    const service = await prisma.service.create({
      data: {
        name: name.trim(),
        slug,
        description:
          description && typeof description === "string"
            ? description.trim() || null
            : null,
      },
    });
    return NextResponse.json(service);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
