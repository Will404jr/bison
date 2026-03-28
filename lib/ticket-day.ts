/** Start of today in server local time. */
export function getStartOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today as YYYY-MM-DD (server local date), matches Ticket.ticketDay. */
export function getTodayTicketDay(): string {
  const d = getStartOfToday();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
