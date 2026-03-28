import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession } from "@/lib/auth";
import { getStartOfToday } from "@/lib/ticket-day";
import { TicketStatus } from "@prisma/client";

function endOfToday(): Date {
  const d = getStartOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

/** Start or end a break interval for the logged-in teller. */
export async function POST(request: Request) {
  const session = await getTellerSession();
  if (!session?.tellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body as { action?: string }).action;
    if (action === "start") {
      const open = await prisma.tellerBreak.findFirst({
        where: { tellerId: session.tellerId, endedAt: null },
      });
      if (open) {
        return NextResponse.json(
          { error: "Already on a break" },
          { status: 400 }
        );
      }
      const serving = await prisma.ticket.findFirst({
        where: {
          servedByTellerId: session.tellerId,
          status: TicketStatus.serving,
        },
      });
      if (serving) {
        return NextResponse.json(
          { error: "Hold or complete your current ticket before starting a break" },
          { status: 400 }
        );
      }
      await prisma.tellerBreak.create({
        data: { tellerId: session.tellerId },
      });
      return NextResponse.json({ success: true, onBreak: true });
    }
    if (action === "end") {
      const open = await prisma.tellerBreak.findFirst({
        where: { tellerId: session.tellerId, endedAt: null },
        orderBy: { startedAt: "desc" },
      });
      if (!open) {
        return NextResponse.json(
          { error: "No break in progress" },
          { status: 400 }
        );
      }
      await prisma.tellerBreak.update({
        where: { id: open.id },
        data: { endedAt: new Date() },
      });
      return NextResponse.json({ success: true, onBreak: false });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update break" },
      { status: 500 }
    );
  }
}

/** Whether the teller has an open break (for UI). */
export async function GET() {
  const session = await getTellerSession();
  if (!session?.tellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const open = await prisma.tellerBreak.findFirst({
    where: { tellerId: session.tellerId, endedAt: null },
  });
  const start = getStartOfToday();
  const end = endOfToday();
  const completedToday = await prisma.tellerBreak.count({
    where: {
      tellerId: session.tellerId,
      endedAt: { not: null },
      startedAt: { gte: start, lt: end },
    },
  });
  return NextResponse.json({
    onBreak: !!open,
    completedBreaksToday: completedToday,
  });
}
