import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodayTicketDay } from "@/lib/ticket-day";
import { TicketStatus } from "@prisma/client";

export async function GET() {
  const ticketDay = getTodayTicketDay();
  const tickets = await prisma.ticket.findMany({
    where: {
      ticketDay,
      status: { in: [TicketStatus.called, TicketStatus.serving] },
      servedByTellerId: { not: null },
    },
    include: {
      servedByTeller: { select: { tillNumber: true } },
    },
    orderBy: { calledAt: "asc" },
  });
  const items = tickets.map((t) => ({
    ticketNumber: t.ticketNumber,
    tillNumber: t.servedByTeller!.tillNumber,
    serviceName: t.queueLabel,
    status: t.status,
    callCount: t.callCount,
  }));
  return NextResponse.json({ tickets: items });
}
