import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTellerSession, isTellerReady } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTellerSession();
  if (!session || !isTellerReady(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });
    if (!ticket || ticket.servedByTellerId !== session.tellerId) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    const body = await request.json();
    const { label } = body as { label?: string };
    if (!label || typeof label !== "string" || !label.trim()) {
      return NextResponse.json(
        { error: "label is required" },
        { status: 400 }
      );
    }
    const transaction = await prisma.ticketTransaction.create({
      data: {
        ticketId: id,
        label: label.trim(),
      },
    });
    return NextResponse.json({ transaction });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to add transaction" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTellerSession();
  if (!session || !isTellerReady(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });
    if (!ticket || ticket.servedByTellerId !== session.tellerId) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    const body = await request.json();
    const { transactionId, completed } = body as {
      transactionId?: string;
      completed?: boolean;
    };
    if (!transactionId || typeof transactionId !== "string") {
      return NextResponse.json(
        { error: "transactionId is required" },
        { status: 400 }
      );
    }
    const transaction = await prisma.ticketTransaction.findFirst({
      where: {
        id: transactionId,
        ticketId: id,
      },
    });
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    await prisma.ticketTransaction.update({
      where: { id: transactionId },
      data: {
        completedAt: completed === true ? new Date() : null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}
