import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession } from "@/lib/auth";
import { TicketStatus } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getTellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const { serviceId } = (body || {}) as { serviceId?: string };
    let categoryId = session.categoryId ?? null;
  if (!categoryId && session.tellerId) {
    const teller = await prisma.teller.findUnique({
      where: { id: session.tellerId },
      select: { categoryId: true },
    });
    categoryId = teller?.categoryId ?? null;
  }
  const where: {
    status: typeof TicketStatus.waiting;
    serviceId?: string;
    service?: { categoryId: string };
  } = { status: TicketStatus.waiting };
  if (serviceId && typeof serviceId === "string") {
    where.serviceId = serviceId;
  } else if (categoryId) {
    where.service = { categoryId };
  }
  const nextTicket = await prisma.ticket.findFirst({
      where,
      orderBy: { createdAt: "asc" },
      include: { service: { select: { name: true } } },
    });
    if (!nextTicket) {
      return NextResponse.json(
        { error: "No tickets waiting in queue" },
        { status: 404 }
      );
    }
    const now = new Date();
    await prisma.ticket.update({
      where: { id: nextTicket.id },
      data: {
        status: TicketStatus.serving,
        servedByTellerId: session.tellerId,
        calledAt: now,
      },
    });
    return NextResponse.json({
      ticket: {
        id: nextTicket.id,
        ticketNumber: nextTicket.ticketNumber,
        serviceName: nextTicket.service.name,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to call next ticket" },
      { status: 500 }
    );
  }
}
