import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TicketStatus } from "@prisma/client";

/** Start of today in server local time (YYYY-MM-DD 00:00:00). */
function getStartOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of today (start of next day). */
function getEndOfToday(): Date {
  const d = getStartOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

/** Parse ticket number like A01, B99, Z99, AA01 into { letters, num }. Format: letters + exactly 2 digits (01–99). */
function parseDailyTicketNumber(ticketNumber: string): { letters: string; num: number } | null {
  const m = ticketNumber.match(/^([A-Z]+)(\d{2})$/);
  if (!m) return null;
  const num = parseInt(m[2], 10);
  if (num < 1 || num > 99) return null;
  return { letters: m[1], num };
}

/** Next letter(s) in sequence: A→B→...→Z→AA→AB→... */
function nextLetter(letters: string): string {
  const toIndex = (s: string): number => {
    let n = 0;
    for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  };
  const toLetters = (n: number): string =>
    n < 26 ? String.fromCharCode(65 + n) : toLetters(Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26));
  return toLetters(toIndex(letters) + 1);
}

/** Compute next ticket number in daily sequence: A01..A99, B01..B99, ... Resets each day to A01. */
function getNextDailyTicketNumber(lastTicketNumber: string | null): string {
  const parsed = lastTicketNumber ? parseDailyTicketNumber(lastTicketNumber) : null;
  if (!parsed) return "A01";
  const { letters, num } = parsed;
  if (num < 99) {
    return letters + (num + 1).toString().padStart(2, "0");
  }
  return nextLetter(letters) + "01";
}

const MAX_CREATE_RETRIES = 5;

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
      include: { category: { select: { name: true } } },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    const queueLabel =
      (service.category?.name ?? "Other") + " - " + service.name;
    const startOfToday = getStartOfToday();
    const endOfToday = getEndOfToday();
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_CREATE_RETRIES; attempt++) {
      const ticketsToday = await prisma.ticket.findMany({
        where: {
          createdAt: { gte: startOfToday, lt: endOfToday },
        },
        orderBy: { createdAt: "desc" },
        select: { ticketNumber: true },
        take: 5000,
      });
      const lastDaily = ticketsToday.find(
        (t) => parseDailyTicketNumber(t.ticketNumber) !== null
      );
      const ticketNumber = getNextDailyTicketNumber(
        lastDaily?.ticketNumber ?? null
      );
      try {
        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber,
            queueLabel,
            status: TicketStatus.waiting,
          },
        });
        const waitingCount = await prisma.ticket.count({
          where: {
            queueLabel,
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
        const isUniqueViolation =
          e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002";
        if (isUniqueViolation && attempt < MAX_CREATE_RETRIES - 1) {
          lastError = e;
          continue;
        }
        throw e;
      }
    }
    console.error(lastError);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
