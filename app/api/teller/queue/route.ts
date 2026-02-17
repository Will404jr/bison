import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession } from "@/lib/auth";
import { TicketStatus } from "@prisma/client";

export async function GET() {
  const session = await getTellerSession();
  if (!session?.tellerId || session.tillNumber == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let categoryId = session.categoryId ?? null;
  if (!categoryId) {
    const teller = await prisma.teller.findUnique({
      where: { id: session.tellerId },
      select: { categoryId: true },
    });
    categoryId = teller?.categoryId ?? null;
  }
  const serviceWhere = categoryId ? { categoryId } : {};
  const categoryQueueLabels: string[] = categoryId
    ? (await prisma.service.findMany({
        where: { categoryId },
        include: { category: { select: { name: true } } },
      })).map((s) => (s.category?.name ?? "Other") + " - " + s.name)
    : [];
  const [stats, currentTicket, allServices, waitingByQueueLabel] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      _count: true,
      where: {
        status: { not: TicketStatus.completed },
        ...(categoryQueueLabels.length > 0
          ? { queueLabel: { in: categoryQueueLabels } }
          : {}),
      },
    }),
    prisma.ticket.findFirst({
      where: {
        servedByTellerId: session.tellerId,
        status: { in: [TicketStatus.serving, TicketStatus.held] },
      },
      include: { transactions: true },
      orderBy: { calledAt: "desc" },
    }),
    prisma.service.findMany({
      where: serviceWhere,
      orderBy: { name: "asc" },
      include: { category: { select: { name: true } } },
    }),
    prisma.ticket.groupBy({
      by: ["queueLabel"],
      _count: true,
      where: {
        status: TicketStatus.waiting,
        ...(categoryQueueLabels.length > 0
          ? { queueLabel: { in: categoryQueueLabels } }
          : {}),
      },
    }),
  ]);
  const statsByStatus = Object.fromEntries(
    stats.map((s) => [s.status, s._count])
  ) as Record<string, number>;
  const waitingCount = statsByStatus[TicketStatus.waiting] ?? 0;
  const calledCount = statsByStatus[TicketStatus.called] ?? 0;
  const servingCount = statsByStatus[TicketStatus.serving] ?? 0;
  const heldCount = statsByStatus[TicketStatus.held] ?? 0;
  const waitingByServiceMap = Object.fromEntries(
    waitingByQueueLabel.map((s) => [s.queueLabel, s._count])
  );
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  const waitingByService = allServices.map((s) => {
    const label = (s.category?.name ?? "Other") + " - " + s.name;
    return {
      serviceId: s.id,
      name: s.name,
      slug: s.slug,
      count: waitingByServiceMap[label] ?? 0,
    };
  });
  return NextResponse.json({
    tillNumber: session.tillNumber,
    categoryId,
    categories,
    stats: {
      waiting: waitingCount,
      called: calledCount,
      serving: servingCount,
      held: heldCount,
    },
    waitingByService,
    services: allServices,
    currentTicket: currentTicket
      ? {
          id: currentTicket.id,
          ticketNumber: currentTicket.ticketNumber,
          status: currentTicket.status,
          serviceName: currentTicket.queueLabel,
          callCount: currentTicket.callCount,
          transactions: currentTicket.transactions,
        }
      : null,
  });
}
