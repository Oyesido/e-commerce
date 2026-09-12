import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin";
import { categorySchema } from "@/lib/validators/catalog";

export async function GET() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" }
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const parsed = categorySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const category = await prisma.category.create({ data: { name: parsed.data.name } });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await request.json();
  const parsed = categorySchema.extend({ id: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const category = await prisma.category.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name }
    });
    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await request.json();
  const id = z.object({ id: z.string().min(1) }).safeParse(body);
  if (!id.success) return NextResponse.json({ error: id.error.flatten() }, { status: 400 });
  try {
    await prisma.category.delete({ where: { id: id.data.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2003") throw error;
    return NextResponse.json(
      { error: "Category cannot be deleted while it has products." },
      { status: 409 }
    );
  }
}
