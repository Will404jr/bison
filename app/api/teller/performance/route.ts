import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession } from "@/lib/auth";
import { getStartOfToday, getTodayTicketDay } from "@/lib/ticket-day";
import { TicketStatus } from "@prisma/client";

function endOfToday(): Date {
  const d = getStartOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Contribution denominator = terminal outcomes for this teller today:
 * completed + no_show (tickets finished at this till today).
 * Numerator = completed only → "served X of Y".
 */
export async function GET() {
  const session = await getTellerSession();
  if (!session?.tellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ticketDay = getTodayTicketDay();
  const dayStart = getStartOfToday();
  const dayEnd = endOfToday();

  const [completedTickets, noShowTickets, breaksEnded, openBreak] =
    await Promise.all([
      prisma.ticket.findMany({
        where: {
          ticketDay,
          servedByTellerId: session.tellerId,
          status: TicketStatus.completed,
        },
        select: {
          id: true,
          ticketNumber: true,
          queueLabel: true,
          status: true,
          calledAt: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.ticket.findMany({
        where: {
          ticketDay,
          servedByTellerId: session.tellerId,
          status: TicketStatus.no_show,
        },
        select: {
          id: true,
          ticketNumber: true,
          queueLabel: true,
          status: true,
          calledAt: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      prisma.tellerBreak.count({
        where: {
          tellerId: session.tellerId,
          endedAt: { not: null },
          startedAt: { gte: dayStart, lt: dayEnd },
        },
      }),
      prisma.tellerBreak.findFirst({
        where: { tellerId: session.tellerId, endedAt: null },
      }),
    ]);

  const completedCount = completedTickets.length;
  const noShowCount = noShowTickets.length;
  const denominator = completedCount + noShowCount;

  const durationsMs: number[] = [];
  for (const t of completedTickets) {
    const end = t.completedAt?.getTime();
    if (end == null) continue;
    const start = (t.calledAt ?? t.createdAt).getTime();
    if (end > start) durationsMs.push(end - start);
  }
  const avgServingTimeMs =
    durationsMs.length > 0
      ? Math.round(
          durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length
        )
      : null;

  const hourCounts = new Map<number, number>();
  for (const t of completedTickets) {
    if (!t.completedAt) continue;
    const h = t.completedAt.getHours();
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
  }
  let peakHour: number | null = null;
  let peakCount = 0;
  for (const [h, c] of hourCounts) {
    if (c > peakCount) {
      peakCount = c;
      peakHour = h;
    }
  }

  const terminal = [...completedTickets, ...noShowTickets].sort(
    (a, b) =>
      (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)
  );

  const history = terminal.slice(0, 50).map((t) => {
    const end = t.completedAt?.getTime();
    const start = (t.calledAt ?? t.createdAt).getTime();
    const durationMs =
      end != null && end > start ? end - start : null;
    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      queueLabel: t.queueLabel,
      status: t.status,
      completedAt: t.completedAt?.toISOString() ?? null,
      durationMs,
    };
  });

  return NextResponse.json({
    ticketDay,
    averageServingTimeMs: avgServingTimeMs,
    totalBreaksToday: breaksEnded,
    onBreak: !!openBreak,
    peakProductivityHour:
      peakHour !== null && peakCount > 0
        ? { hour: peakHour, completedCount: peakCount }
        : null,
    /** Served (completed) out of all terminal outcomes (completed + no_show) today. */
    contribution: {
      completed: completedCount,
      noShow: noShowCount,
      totalHandled: denominator,
    },
    history,
  });
}
