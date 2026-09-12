"use client";

import { FormEvent, useEffect, useState } from "react";

type Item = { quantity: number; product: { name: string; price: number; images: string[] } };

export default function CheckoutClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  useEffect(() => {
    fetch("/api/cart").then(async (response) => {
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Could not load your cart.");
      else setItems(body.items ?? []);
    }).catch(() => setError("Could not load your cart."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not start payment.");
      setBusy(false);
      return;
    }
    window.location.assign(body.authorizationUrl);
  }

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="space-y-4 rounded border bg-white p-6">
          <h2 className="text-xl font-semibold">Shipping details</h2>
          <input name="shippingName" required placeholder="Full name" className="w-full rounded border px-3 py-2" />
          <input name="shippingEmail" required type="email" placeholder="Email" className="w-full rounded border px-3 py-2" />
          <input name="shippingPhone" required placeholder="Phone number" className="w-full rounded border px-3 py-2" />
          <textarea name="shippingAddress" required rows={4} placeholder="Delivery address" className="w-full rounded border px-3 py-2" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy || items.length === 0} className="w-full rounded bg-brand px-4 py-3 font-semibold text-white disabled:bg-slate-300">
            {busy ? "Redirecting to Paystack..." : "Pay with Paystack"}
          </button>
        </form>
        <aside className="h-fit rounded border bg-white p-6">
          <h2 className="text-xl font-semibold">Order review</h2>
          <div className="mt-4 space-y-3">
            {items.map((item, index) => (
              <div key={`${item.product.name}-${index}`} className="flex justify-between gap-4 text-sm">
                <span>{item.product.name} × {item.quantity}</span>
                <span>₦{((item.product.price * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
          {items.length === 0 && <p className="mt-4 text-sm text-slate-600">Your cart is empty.</p>}
          <p className="mt-6 flex justify-between border-t pt-4 font-bold"><span>Total</span><span>₦{(total / 100).toFixed(2)}</span></p>
        </aside>
      </div>
    </main>
  );
}
