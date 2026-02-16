import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TicketStatus } from "@prisma/client";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [waiting, serving, completedToday, servicesCount, tellersCount] =
    await Promise.all([
      prisma.ticket.count({ where: { status: TicketStatus.waiting } }),
      prisma.ticket.count({
        where: { status: { in: [TicketStatus.serving, TicketStatus.called] } },
      }),
      prisma.ticket.count({
        where: {
          status: TicketStatus.completed,
          completedAt: { gte: today },
        },
      }),
      prisma.service.count(),
      prisma.teller.count(),
    ]);
  return NextResponse.json({
    waiting,
    serving,
    completedToday,
    servicesCount,
    tellersCount,
  });
}
