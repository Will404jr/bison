import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession, isTellerReady } from "@/lib/auth";
import { TicketStatus } from "@prisma/client";

async function getTicketAndCheckTeller(
  ticketId: string,
  tellerId: string
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });
  if (!ticket) return null;
  if (ticket.servedByTellerId !== tellerId) return null;
  return ticket;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTellerSession();
  if (!session || !isTellerReady(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const { action } = body as { action?: string };
    const ticket = await getTicketAndCheckTeller(id, session.tellerId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (action === "hold") {
      if (ticket.status !== TicketStatus.serving) {
        return NextResponse.json(
          { error: "Only serving tickets can be held" },
          { status: 400 }
        );
      }
      await prisma.ticket.update({
        where: { id },
        data: { status: TicketStatus.held },
      });
      return NextResponse.json({ success: true, status: TicketStatus.held });
    }
    if (action === "callAgain") {
      await prisma.ticket.update({
        where: { id },
        data: {
          status: TicketStatus.called,
          callCount: { increment: 1 },
        },
      });
      return NextResponse.json({ success: true, status: TicketStatus.called });
    }
    if (action === "complete") {
      await prisma.ticket.update({
        where: { id },
        data: {
          status: TicketStatus.completed,
          completedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, status: TicketStatus.completed });
    }
    if (action === "resume" && ticket.status === TicketStatus.held) {
      await prisma.ticket.update({
        where: { id },
        data: { status: TicketStatus.serving },
      });
      return NextResponse.json({ success: true, status: TicketStatus.serving });
    }
    return NextResponse.json(
      { error: "Invalid action or state" },
      { status: 400 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}
