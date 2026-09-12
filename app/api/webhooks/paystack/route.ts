import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  if (!signature || !/^[a-f0-9]+$/i.test(signature) || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: { event?: string; data?: { reference?: string; status?: string; amount?: number } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  if (payload.event !== "charge.success" || !payload.data?.reference) {
    return NextResponse.json({ received: true });
  }

  const reference = payload.data.reference;
  const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const verification = await verifyResponse.json();
  if (!verifyResponse.ok || verification.status !== true || verification.data?.status !== "success") {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { paystackRef: reference },
    include: { items: { include: { product: true } } }
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (verification.data.amount !== order.total) {
    return NextResponse.json({ error: "Payment amount does not match order." }, { status: 400 });
  }
  if (order.status === "PAID") return NextResponse.json({ received: true });
  if (order.status !== "PENDING") {
    return NextResponse.json({ error: "Order is not payable." }, { status: 409 });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      for (const item of order.items) {
        const updated = await transaction.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } }
        });
        if (updated.count !== 1) throw new Error("Insufficient stock while completing payment.");
      }
      await transaction.order.update({
        where: { id: order.id },
        data: { status: "PAID" }
      });
      await transaction.cartItem.deleteMany({ where: { userId: order.userId } });
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete order." }, { status: 409 });
  }

  try {
    await sendOrderConfirmationEmail(order);
  } catch (error) {
    console.error("Order was paid but confirmation email failed.", error);
  }
  return NextResponse.json({ received: true });
}
