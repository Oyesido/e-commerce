import { NextResponse } from "next/server";
import { Prisma, OrderStatus } from "@prisma/client";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { allowedOrderTransitions, updateOrderStatusSchema } from "@/lib/validators/orders";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const orders = await prisma.order.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { product: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(orders);
}

export async function PATCH(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const parsed = updateOrderStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const current = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      select: { status: true }
    });
    if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (!allowedOrderTransitions[current.status].includes(parsed.data.status)) {
      return NextResponse.json({ error: `Cannot move an order from ${current.status} to ${parsed.data.status}.` }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id: parsed.data.orderId },
      data: { status: parsed.data.status as OrderStatus },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } }
      }
    });
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    throw error;
  }
}
