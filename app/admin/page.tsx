import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminCategoriesClient } from "./AdminCategoriesClient";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0
});

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  PROCESSING: "bg-sky-50 text-sky-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700"
};

export default async function AdminPage() {
  if (!(await getAdminSession())) redirect("/login");

  const [productCount, categories, customerCount, orderCount, pendingOrderCount, revenue, recentOrders, lowStockProducts] =
    await Promise.all([
      prisma.product.count(),
      prisma.category.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: "asc" }
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.aggregate({
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true }
      }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          items: { select: { quantity: true } }
        }
      }),
      prisma.product.findMany({
        where: { stock: { lte: 5 } },
        take: 5,
        orderBy: { stock: "asc" },
        select: { id: true, name: true, stock: true }
      })
    ]);

  const stats = [
    { label: "Revenue", value: currency.format((revenue._sum.total ?? 0) / 100), note: "Paid orders" },
    { label: "Orders", value: orderCount.toLocaleString(), note: `${pendingOrderCount} awaiting payment` },
    { label: "Products", value: productCount.toLocaleString(), note: `${categories.length} categories` },
    { label: "Customers", value: customerCount.toLocaleString(), note: "Registered accounts" }
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">MarketHub</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin dashboard</h1>
          </div>
          <nav aria-label="Admin navigation" className="flex items-center gap-2 text-sm font-medium">
            <Link href="/admin" className="rounded-lg bg-teal-50 px-4 py-2 text-brand" aria-current="page">
              Overview
            </Link>
            <Link href="/admin/products" className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100">
              Products
            </Link>
            <Link href="/admin/orders" className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100">
              Orders
            </Link>
            <Link href="/shop" className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100">
              View store
            </Link>
          </nav>
        </div>
      </header>

      <div className="container space-y-8 py-8">
        <section aria-labelledby="overview-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="overview-heading" className="text-lg font-semibold text-slate-900">Store overview</h2>
              <p className="mt-1 text-sm text-slate-500">A snapshot of your store activity.</p>
            </div>
            <Link href="/admin/orders" className="text-sm font-semibold text-brand hover:underline">
              Review orders
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                <p className="mt-2 text-sm text-slate-500">{stat.note}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <section aria-labelledby="recent-orders-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="recent-orders-heading" className="font-semibold text-slate-900">Recent orders</h2>
                <p className="mt-1 text-sm text-slate-500">The latest activity from your customers.</p>
              </div>
              <Link href="/admin/orders" className="text-sm font-semibold text-brand hover:underline">View all</Link>
            </div>
            {recentOrders.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Customer</th>
                      <th scope="col" className="px-5 py-3 font-medium">Date</th>
                      <th scope="col" className="px-5 py-3 font-medium">Total</th>
                      <th scope="col" className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">{order.user.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items · {order.user.email}</p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {order.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                          {currency.format(order.total / 100)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status]}`}>
                            {order.status.toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">No orders yet. Orders will appear here when customers check out.</p>
            )}
          </section>

          <section aria-labelledby="inventory-heading" className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="inventory-heading" className="font-semibold text-slate-900">Low stock</h2>
                <p className="mt-1 text-sm text-slate-500">Products with 5 or fewer units.</p>
              </div>
              <Link href="/admin/products" className="text-sm font-semibold text-brand hover:underline">Manage</Link>
            </div>
            {lowStockProducts.length ? (
              <ul className="divide-y divide-slate-100">
                {lowStockProducts.map((product) => (
                  <li key={product.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="truncate text-sm font-medium text-slate-800">{product.name}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${product.stock === 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                      {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">All products have more than 5 units in stock.</p>
            )}
          </section>
        </div>

        <section id="categories" aria-labelledby="categories-heading">
          <div className="mb-4">
            <h2 id="categories-heading" className="text-lg font-semibold text-slate-900">Manage categories</h2>
            <p className="mt-1 text-sm text-slate-500">Organize products in your store.</p>
          </div>
          <AdminCategoriesClient initialCategories={categories} />
        </section>
      </div>
    </main>
  );
}
