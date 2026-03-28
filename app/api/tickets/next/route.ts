import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession } from "@/lib/auth";
import { getTodayTicketDay } from "@/lib/ticket-day";
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
  let queueLabels: string[] | null = null;
  if (serviceId && typeof serviceId === "string") {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { category: { select: { name: true } } },
    });
    if (service) {
      queueLabels = [(service.category?.name ?? "Other") + " - " + service.name];
    }
  } else if (categoryId) {
    const services = await prisma.service.findMany({
      where: { categoryId },
      include: { category: { select: { name: true } } },
    });
    queueLabels = services.map(
      (s) => (s.category?.name ?? "Other") + " - " + s.name
    );
  }
  const ticketDay = getTodayTicketDay();
  const where: {
    ticketDay: string;
    status: typeof TicketStatus.waiting;
    queueLabel?: { in: string[] };
  } = {
    ticketDay,
    status: TicketStatus.waiting,
  };
  if (queueLabels?.length) {
    where.queueLabel = { in: queueLabels };
  }
  const nextTicket = await prisma.ticket.findFirst({
    where,
    orderBy: { createdAt: "asc" },
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
      serviceName: nextTicket.queueLabel,
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
