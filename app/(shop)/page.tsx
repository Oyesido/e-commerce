import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddToCartButton } from "./AddToCartButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold">E-Commerce Store</h1>
      <p className="mt-2 text-slate-600">Browse our latest products.</p>
      {products.length === 0 ? (
        <p className="mt-10 rounded border bg-white p-6 text-slate-600">No products are available yet.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded border bg-white shadow-sm">
              <Link href={`/products/${product.id}`} className="block transition hover:opacity-80">
                {product.images[0] ? (
                  <img src={product.images[0]} alt={product.name} className="h-56 w-full object-cover" />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-slate-100 text-slate-500">No image</div>
                )}
                <div className="p-4">
                <p className="text-sm text-brand">{product.category.name}</p>
                <h2 className="mt-1 text-lg font-semibold">{product.name}</h2>
                <p className="mt-2 font-bold">₦{(product.price / 100).toFixed(2)}</p>
                </div>
              </Link>
              <div className="px-4 pb-4"><AddToCartButton productId={product.id} stock={product.stock} disabled={product.stock < 1} /></div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
