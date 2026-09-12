import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin";
import { productUpdateSchema } from "@/lib/validators/catalog";

type Context = { params: { id: string } };

export async function GET(_request: Request, { params }: Context) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true }
  });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(request: Request, { params }: Context) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const parsed = productUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 400 });
  }

  try {
    const product = await prisma.product.update({
      where: { id: params.id },
      data: parsed.data,
      include: { category: true }
    });
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    await prisma.product.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code !== "P2003") throw error;
    return NextResponse.json(
      { error: "Product cannot be deleted because it is referenced by an order or cart." },
      { status: 409 }
    );
  }
}
