"use client";

import { useState } from "react";

type Status = "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
type Order = {
  id: string;
  status: Status;
  total: number;
  createdAt: string;
  user: { name: string; email: string };
  items: { id: string; quantity: number; price: number; product: { name: string } }[];
};

const transitions: Record<Status, Status[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: []
};

export function AdminOrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function updateStatus(orderId: string, status: Status) {
    setSaving(orderId);
    setError("");
    const response = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status })
    });
    const body = await response.json();
    setSaving(null);
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "Could not update order.");
      return;
    }
    setOrders((current) => current.map((order) => order.id === orderId ? body : order));
  }

  return (
    <div className="mt-8 space-y-5">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {orders.length === 0 && <p className="rounded border bg-white p-6 text-slate-600">No orders yet.</p>}
      {orders.map((order) => (
        <article key={order.id} className="rounded border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">{order.user.name}</h2>
              <p className="text-sm text-slate-600">{order.user.email}</p>
              <p className="mt-1 text-xs text-slate-500">Order {order.id} · {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold">₦{(order.total / 100).toFixed(2)}</span>
              <select value={order.status} disabled={saving === order.id || transitions[order.status].length === 0} onChange={(event) => void updateStatus(order.id, event.target.value as Status)} className="rounded border px-3 py-2 text-sm">
                <option value={order.status}>{order.status}</option>
                {transitions[order.status].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 border-t pt-4 text-sm">
            {order.items.map((item) => <p key={item.id}>{item.product.name} × {item.quantity} — ₦{((item.price * item.quantity) / 100).toFixed(2)}</p>)}
          </div>
        </article>
      ))}
    </div>
  );
}
