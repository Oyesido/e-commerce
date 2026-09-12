import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminOrdersClient } from "./AdminOrdersClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  if (!(await getAdminSession())) redirect("/login");
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
      items: { include: { product: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  const serializedOrders = orders.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString()
  }));
  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold">Manage orders</h1>
      <p className="mt-2 text-slate-600">Review customer orders and update fulfillment status.</p>
      <AdminOrdersClient initialOrders={serializedOrders} />
    </main>
  );
}
