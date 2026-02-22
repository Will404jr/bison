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

/** Today as YYYY-MM-DD (server local date). */
function getTodayTicketDay(): string {
  const d = getStartOfToday();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
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

/** From a list of ticket numbers in daily format, return the one that sorts last (max in sequence). */
function getMaxDailyTicketNumber(
  ticketNumbers: string[]
): string | null {
  const parsed = ticketNumbers
    .map((n) => parseDailyTicketNumber(n))
    .filter((p): p is { letters: string; num: number } => p !== null);
  if (parsed.length === 0) return null;
  const toIndex = (letters: string): number => {
    let n = 0;
    for (let i = 0; i < letters.length; i++)
      n = n * 26 + (letters.charCodeAt(i) - 64);
    return n - 1;
  };
  let max = parsed[0];
  for (let i = 1; i < parsed.length; i++) {
    const cur = parsed[i];
    const maxIdx = toIndex(max.letters) * 100 + max.num;
    const curIdx = toIndex(cur.letters) * 100 + cur.num;
    if (curIdx > maxIdx) max = cur;
  }
  return max.letters + max.num.toString().padStart(2, "0");
}

const MAX_CREATE_RETRIES = 8;
const RETRY_DELAY_MS = 80;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serviceId, queueLabel: bodyQueueLabel } = body as {
      serviceId?: string;
      queueLabel?: string;
    };
    let queueLabel: string;
    if (bodyQueueLabel != null && typeof bodyQueueLabel === "string" && bodyQueueLabel.trim()) {
      queueLabel = bodyQueueLabel.trim();
    } else if (serviceId && typeof serviceId === "string") {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: { category: { select: { name: true } } },
      });
      if (!service) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }
      queueLabel = (service.category?.name ?? "Other") + " - " + service.name;
    } else {
      return NextResponse.json(
        { error: "serviceId or queueLabel is required" },
        { status: 400 }
      );
    }
    const ticketDay = getTodayTicketDay();
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_CREATE_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
      try {
        const result = await prisma.$transaction(async (tx) => {
          const ticketsToday = await tx.ticket.findMany({
            where: { ticketDay },
            select: { ticketNumber: true },
            take: 5000,
          });
          const dailyNumbers = ticketsToday
            .map((t) => t.ticketNumber)
            .filter((n) => parseDailyTicketNumber(n) !== null);
          const maxDaily = getMaxDailyTicketNumber(dailyNumbers);
          const ticketNumber = getNextDailyTicketNumber(maxDaily);
          const ticket = await tx.ticket.create({
            data: {
              ticketDay,
              ticketNumber,
              queueLabel,
              status: TicketStatus.waiting,
            },
          });
          return { ticket, ticketNumber };
        });
        const waitingCount = await prisma.ticket.count({
          where: {
            queueLabel,
            status: TicketStatus.waiting,
            createdAt: { lt: result.ticket.createdAt },
          },
        });
        return NextResponse.json({
          ticketNumber: result.ticket.ticketNumber,
          ticketId: result.ticket.id,
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
