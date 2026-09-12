import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { cartRequestSchema, removeCartItemSchema } from "@/lib/validators/cart";

async function getUserId() {
  const session = await getAuthSession();
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ items: [] });

  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: { include: { category: true } } },
    orderBy: { id: "asc" }
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const parsed = cartRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const requestedItems = parsed.data.items ?? [{
    productId: parsed.data.productId!,
    quantity: parsed.data.quantity!
  }];
  const productIds = [...new Set(requestedItems.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((product) => [product.id, product]));
  const invalid = requestedItems.find((item) => {
    const product = productMap.get(item.productId);
    return !product || product.stock < 1;
  });
  if (invalid) return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });

  const quantities = new Map<string, number>();
  for (const item of requestedItems) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  try {
    await prisma.$transaction(async (transaction) => {
      for (const [productId, requestedQuantity] of quantities) {
        const product = productMap.get(productId)!;
        const existing = await transaction.cartItem.findUnique({
          where: { userId_productId: { userId, productId } }
        });
        const quantity = parsed.data.items
          ? (existing?.quantity ?? 0) + requestedQuantity
          : parsed.data.mode === "set" ? requestedQuantity : (existing?.quantity ?? 0) + requestedQuantity;
        if (quantity > product.stock) {
          throw new Error(`Only ${product.stock} of ${product.name} are available.`);
        }
        await transaction.cartItem.upsert({
          where: { userId_productId: { userId, productId } },
          create: { userId, productId, quantity },
          update: { quantity }
        });
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update cart." }, { status: 400 });
  }

  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: { include: { category: true } } },
    orderBy: { id: "asc" }
  });
  return NextResponse.json({ items });
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const parsed = removeCartItemSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await prisma.cartItem.deleteMany({
    where: { userId, productId: parsed.data.productId }
  });
  return new NextResponse(null, { status: 204 });
}
