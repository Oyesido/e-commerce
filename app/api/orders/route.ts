import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user.id) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: { include: { product: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(orders);
}
