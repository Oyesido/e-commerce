import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const session = await getAuthSession();
  if (!session?.user.id) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold">Your orders</h1>
      {orders.length === 0 ? (
        <p className="mt-8 rounded border bg-white p-6 text-slate-600">You have no orders yet.</p>
      ) : (
        <div className="mt-8 space-y-6">
          {orders.map((order) => (
            <article key={order.id} className="rounded border bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h2 className="font-semibold">Order {order.id}</h2>
                  <p className="text-sm text-slate-500">{order.createdAt.toLocaleDateString()}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{order.status}</span>
              </div>
              <div className="mt-4 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-4 text-sm">
                    <span>{item.product.name} × {item.quantity}</span>
                    <span>₦{((item.price * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t pt-4 text-right font-bold">Total: ₦{(order.total / 100).toFixed(2)}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
