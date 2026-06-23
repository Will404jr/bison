import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession, resolveTellerBranchId } from "@/lib/auth";
import { getTodayTicketDay } from "@/lib/ticket-day";
import { TicketStatus } from "@prisma/client";

export async function GET() {
  const session = await getTellerSession();
  if (!session?.tellerId || session.tillNumber == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branchId = await resolveTellerBranchId(session);
  if (!branchId) {
    return NextResponse.json({ error: "User is not assigned to a branch" }, { status: 403 });
  }
  let serviceId = session.serviceId ?? null;
  if (!serviceId) {
    const teller = await prisma.teller.findUnique({
      where: { id: session.tellerId },
      select: { serviceId: true },
    });
    serviceId = teller?.serviceId ?? null;
  }
  const servedService = serviceId
    ? await prisma.service.findUnique({
        where: { id: serviceId },
        select: { id: true, name: true },
      })
    : null;
  const serviceName = servedService?.name ?? null;
  const ticketDay = getTodayTicketDay();
  const serviceFilter = serviceName ? { queueLabel: serviceName } : {};

  const branchFilter = { branchId };

  const [stats, currentTicket, allServices, waitingByQueueLabel, noShowToday, branch] =
    await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      _count: true,
      where: {
        ticketDay,
        status: { notIn: [TicketStatus.completed, TicketStatus.no_show] },
        ...branchFilter,
        ...serviceFilter,
      },
    }),
    prisma.ticket.findFirst({
      where: {
        ticketDay,
        branchId,
        servedByTellerId: session.tellerId,
        status: { in: [TicketStatus.serving, TicketStatus.held, TicketStatus.called] },
      },
      include: { transactions: true },
      orderBy: { calledAt: "desc" },
    }),
    prisma.service.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.ticket.groupBy({
      by: ["queueLabel"],
      _count: true,
      where: {
        ticketDay,
        status: TicketStatus.waiting,
        ...branchFilter,
        ...serviceFilter,
      },
    }),
    prisma.ticket.count({
      where: {
        ticketDay,
        status: TicketStatus.no_show,
        ...branchFilter,
        ...serviceFilter,
      },
    }),
    prisma.branch.findUnique({
      where: { id: branchId },
      select: { name: true },
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
  const waitingByService = allServices.map((s) => ({
    serviceId: s.id,
    name: s.name,
    slug: s.slug,
    count: waitingByServiceMap[s.name] ?? 0,
  }));
  return NextResponse.json({
    tillNumber: session.tillNumber,
    serviceId,
    serviceName,
    branchId,
    branchName: branch?.name ?? null,
    stats: {
      waiting: waitingCount,
      called: calledCount,
      serving: servingCount,
      held: heldCount,
      noShow: noShowToday,
    },
    waitingByService,
    services: allServices,
    currentTicket: currentTicket
      ? {
          id: currentTicket.id,
          ticketNumber: currentTicket.ticketNumber,
          status: currentTicket.status,
          serviceName: currentTicket.queueLabel,
          phoneNumber: currentTicket.phoneNumber,
          callCount: currentTicket.callCount,
          transactions: currentTicket.transactions,
        }
      : null,
  });
}
