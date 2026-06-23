import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTodayTicketDay } from "@/lib/ticket-day";
import { getBranchSession } from "@/lib/auth";
import { TicketStatus } from "@prisma/client";

function mapWithTill(t: {
  ticketNumber: string;
  queueLabel: string;
  status: TicketStatus;
  callCount: number;
  servedByTeller: { tillNumber: number } | null;
}) {
  return {
    ticketNumber: t.ticketNumber,
    tillNumber: t.servedByTeller!.tillNumber,
    queueLabel: t.queueLabel,
    status: t.status,
    callCount: t.callCount,
  };
}

function mapWaiting(t: {
  ticketNumber: string;
  queueLabel: string;
  status: TicketStatus;
}) {
  return {
    ticketNumber: t.ticketNumber,
    queueLabel: t.queueLabel,
    status: t.status,
  };
}

export async function GET() {
  const session = await getBranchSession();
  if (!session?.branchId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branchId = session.branchId;
  const ticketDay = getTodayTicketDay();

  const [servingTickets, heldTickets, waitingTickets] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ticketDay,
        branchId,
        status: { in: [TicketStatus.called, TicketStatus.serving] },
        servedByTellerId: { not: null },
      },
      include: {
        servedByTeller: { select: { tillNumber: true } },
      },
      orderBy: { calledAt: "asc" },
    }),
    prisma.ticket.findMany({
      where: {
        ticketDay,
        branchId,
        status: TicketStatus.held,
        servedByTellerId: { not: null },
      },
      include: {
        servedByTeller: { select: { tillNumber: true } },
      },
      orderBy: { calledAt: "asc" },
    }),
    prisma.ticket.findMany({
      where: {
        ticketDay,
        branchId,
        status: TicketStatus.waiting,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    serving: servingTickets.map(mapWithTill),
    held: heldTickets.map(mapWithTill),
    waiting: waitingTickets.map(mapWaiting),
  });
}
