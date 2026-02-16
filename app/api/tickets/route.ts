import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TicketStatus } from "@prisma/client";

const SERVICE_PREFIXES: Record<string, string> = {};
function getPrefixForService(serviceId: string, slug: string): string {
  if (SERVICE_PREFIXES[serviceId]) return SERVICE_PREFIXES[serviceId];
  const first = slug.charAt(0).toUpperCase();
  SERVICE_PREFIXES[serviceId] = first;
  return first;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serviceId } = body as { serviceId?: string };
    if (!serviceId || typeof serviceId !== "string") {
      return NextResponse.json(
        { error: "serviceId is required" },
        { status: 400 }
      );
    }
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    const lastTicket = await prisma.ticket.findFirst({
      where: { serviceId },
      orderBy: { createdAt: "desc" },
    });
    const prefix = getPrefixForService(service.id, service.slug);
    const num = lastTicket
      ? parseInt(lastTicket.ticketNumber.slice(1), 10) + 1
      : 1;
    const ticketNumber = `${prefix}${num.toString().padStart(3, "0")}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        serviceId,
        status: TicketStatus.waiting,
      },
    });
    const waitingCount = await prisma.ticket.count({
      where: {
        serviceId,
        status: TicketStatus.waiting,
        createdAt: { lt: ticket.createdAt },
      },
    });
    return NextResponse.json({
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      waitingAhead: waitingCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
