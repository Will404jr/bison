import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession, resolveTellerBranchId } from "@/lib/auth";
import { getTodayTicketDay } from "@/lib/ticket-day";
import { TicketStatus } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getTellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branchId = await resolveTellerBranchId(session);
  if (!branchId) {
    return NextResponse.json({ error: "User is not assigned to a branch" }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const { serviceId: bodyServiceId } = (body || {}) as { serviceId?: string };
    let serviceId =
      (bodyServiceId && typeof bodyServiceId === "string" ? bodyServiceId : null) ??
      session.serviceId ??
      null;
    if (!serviceId && session.tellerId) {
      const teller = await prisma.teller.findUnique({
        where: { id: session.tellerId },
        select: { serviceId: true },
      });
      serviceId = teller?.serviceId ?? null;
    }
    let queueLabel: string | null = null;
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { name: true },
      });
      queueLabel = service?.name ?? null;
    }
  const ticketDay = getTodayTicketDay();
  const where: {
    ticketDay: string;
    branchId: string;
    status: typeof TicketStatus.waiting;
    queueLabel?: string;
  } = {
    ticketDay,
    branchId,
    status: TicketStatus.waiting,
  };
  if (queueLabel) {
    where.queueLabel = queueLabel;
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
