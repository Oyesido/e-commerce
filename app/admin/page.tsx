import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminCategoriesClient } from "./AdminCategoriesClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await getAdminSession())) redirect("/login");
  const [categories, productCount] = await Promise.all([
    prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } }),
    prisma.product.count()
  ]);
  return (
    <main className="container space-y-8 py-12">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Admin dashboard</h1><p className="mt-2 text-slate-600">{productCount} products</p></div>
        <div className="flex gap-3">
          <Link href="/admin/products" className="rounded border px-4 py-2 font-semibold">Products</Link>
          <Link href="/admin/orders" className="rounded bg-brand px-4 py-2 font-semibold text-white">Orders</Link>
        </div>
      </div>
      <AdminCategoriesClient initialCategories={categories} />
    </main>
  );
}
