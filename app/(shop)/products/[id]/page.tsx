import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AddToCartButton } from "../../AddToCartButton";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  return product ? { title: `${product.name} | MarketHub`, description: product.description } : {};
}

export default async function ProductDetailPage({ params }: Props) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true }
  });
  if (!product) notFound();

  return (
    <main className="container py-12">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          {product.images[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full rounded border bg-white object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded border bg-slate-100 text-slate-500">No image</div>
          )}
          {product.images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {product.images.map((image) => <img key={image} src={image} alt="" className="h-20 w-full rounded object-cover" />)}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-brand">{product.category.name}</p>
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
          <p className="mt-4 text-2xl font-bold">₦{(product.price / 100).toFixed(2)}</p>
          <p className="mt-6 whitespace-pre-wrap text-slate-700">{product.description}</p>
          <p className="mt-6 text-sm text-slate-600">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
          <div className="mt-6"><AddToCartButton productId={product.id} stock={product.stock} disabled={product.stock < 1} /></div>
        </div>
      </div>
    </main>
  );
}
