import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validators/checkout";

const PAYSTACK_URL = "https://api.paystack.co/transaction/initialize";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user.id) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });

  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cart = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { product: true }
  });
  if (cart.length === 0) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });

  const unavailable = cart.find((item) => item.quantity > item.product.stock);
  if (unavailable) {
    return NextResponse.json({ error: `${unavailable.product.name} does not have enough stock.` }, { status: 409 });
  }

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const reference = `order_${randomUUID()}`;
  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      status: "PENDING",
      total,
      paystackRef: reference,
      ...parsed.data,
      items: {
        create: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price
        }))
      }
    }
  });

  try {
    const response = await fetch(PAYSTACK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: parsed.data.shippingEmail,
        amount: total,
        currency: "NGN",
        reference,
        callback_url: `${process.env.NEXTAUTH_URL ?? new URL(request.url).origin}/checkout/confirmation?reference=${encodeURIComponent(reference)}`,
        metadata: { orderId: order.id }
      })
    });
    const result = await response.json();
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
      return NextResponse.json({ error: result.message ?? "Could not initialize Paystack transaction." }, { status: 502 });
    }
    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
      reference: result.data.reference
    });
  } catch {
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
    return NextResponse.json({ error: "Could not connect to Paystack." }, { status: 502 });
  }
}
