import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminProductsClient } from "./AdminProductsClient";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  if (!(await getAdminSession())) redirect("/login");
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } })
  ]);
  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold">Manage products</h1>
      <p className="mt-2 text-slate-600">Create products and upload images directly to Cloudinary.</p>
      <div className="mt-8"><AdminProductsClient initialProducts={products} categories={categories} /></div>
    </main>
  );
}
