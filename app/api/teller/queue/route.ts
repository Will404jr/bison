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
  const [stats, currentTicket, allServices, waitingByService] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      _count: true,
      where: {
        status: { not: TicketStatus.completed },
        ...(categoryId ? { service: { categoryId } } : {}),
      },
    }),
    prisma.ticket.findFirst({
      where: {
        servedByTellerId: session.tellerId,
        status: { in: [TicketStatus.serving, TicketStatus.held] },
      },
      include: {
        service: { select: { name: true } },
        transactions: true,
      },
      orderBy: { calledAt: "desc" },
    }),
    prisma.service.findMany({
      where: serviceWhere,
      orderBy: { name: "asc" },
    }),
    prisma.ticket.groupBy({
      by: ["serviceId"],
      _count: true,
      where: {
        status: TicketStatus.waiting,
        ...(categoryId ? { service: { categoryId } } : {}),
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
  const serviceIds = waitingByService.map((s) => s.serviceId);
  const serviceList = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true, slug: true },
  });
  const waitingByServiceMap = Object.fromEntries(
    waitingByService.map((s) => [s.serviceId, s._count])
  );
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
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
    waitingByService: serviceList.map((s) => ({
      serviceId: s.id,
      name: s.name,
      slug: s.slug,
      count: waitingByServiceMap[s.id] ?? 0,
    })),
    services: allServices,
    currentTicket: currentTicket
      ? {
          id: currentTicket.id,
          ticketNumber: currentTicket.ticketNumber,
          status: currentTicket.status,
          serviceName: currentTicket.service.name,
          callCount: currentTicket.callCount,
          transactions: currentTicket.transactions,
        }
      : null,
  });
}
