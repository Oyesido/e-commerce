"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; price: number; stock: number; images: string[] };
type CartItem = { productId: string; quantity: number; product: Product };
type GuestItem = { productId: string; quantity: number };
const STORAGE_KEY = "markethub-cart";

function readGuestCart(): GuestItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items: GuestItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export function addGuestItem(productId: string, quantity = 1, maxQuantity = 100) {
  const items = readGuestCart();
  const existing = items.find((item) => item.productId === productId);
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, maxQuantity);
  else items.push({ productId, quantity });
  writeGuestCart(items);
}

export default function CartClient() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const sessionResponse = await fetch("/api/auth/session");
    const session = await sessionResponse.json();
    const loggedIn = Boolean(session?.user);
    setAuthenticated(loggedIn);
    if (loggedIn) {
      const response = await fetch("/api/cart");
      const body = await response.json();
      setItems(body.items ?? []);
    } else {
      const response = await fetch("/api/products");
      const body = await response.json();
      setProducts(body);
    }
  }

  useEffect(() => {
    void load();
    const update = () => void load();
    window.addEventListener("cart-updated", update);
    return () => window.removeEventListener("cart-updated", update);
  }, []);

  const guestItems = useMemo(() => {
    if (authenticated !== false) return [];
    const guest = readGuestCart();
    return guest.flatMap((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return product ? [{ productId: item.productId, quantity: item.quantity, product }] : [];
    });
  }, [authenticated, products]);
  const visibleItems = authenticated ? items : guestItems;
  const total = visibleItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  async function updateQuantity(item: CartItem | (GuestItem & { product: Product }), quantity: number) {
    if (quantity < 1) return remove(item.productId);
    setError("");
    if (authenticated) {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId, quantity, mode: "set" })
      });
      const body = await response.json();
      if (!response.ok) return setError(body.error ?? "Could not update cart.");
      setItems(body.items);
    } else {
      const guest = readGuestCart().map((current) => current.productId === item.productId
        ? { ...current, quantity: Math.min(quantity, item.product.stock) }
        : current);
      writeGuestCart(guest);
      setProducts((current) => [...current]);
    }
  }

  async function remove(productId: string) {
    setError("");
    if (authenticated) {
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      if (!response.ok) return setError("Could not remove item.");
      setItems((current) => current.filter((item) => item.productId !== productId));
    } else {
      writeGuestCart(readGuestCart().filter((item) => item.productId !== productId));
      setProducts((current) => [...current]);
    }
  }

  if (authenticated === null) return <main className="container py-12">Loading cart...</main>;
  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold">Your cart</h1>
      {visibleItems.length === 0 ? (
        <p className="mt-8 rounded border bg-white p-6 text-slate-600">Your cart is empty.</p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {visibleItems.map((item) => (
              <div key={item.productId} className="flex gap-4 rounded border bg-white p-4">
                {item.product.images[0] ? <img src={item.product.images[0]} alt="" className="h-24 w-24 rounded object-cover" /> : <div className="h-24 w-24 rounded bg-slate-100" />}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{item.product.name}</h2>
                  <p className="mt-1">₦{(item.product.price / 100).toFixed(2)}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => void updateQuantity(item, item.quantity - 1)} className="rounded border px-2">−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => void updateQuantity(item, item.quantity + 1)} className="rounded border px-2">+</button>
                    <button onClick={() => void remove(item.productId)} className="ml-3 text-sm text-red-700">Remove</button>
                  </div>
                </div>
                <p className="font-semibold">₦{((item.product.price * item.quantity) / 100).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <aside className="h-fit rounded border bg-white p-6">
            <h2 className="text-xl font-semibold">Summary</h2>
            <p className="mt-4 flex justify-between"><span>Total</span><strong>₦{(total / 100).toFixed(2)}</strong></p>
            {!authenticated && <p className="mt-4 text-sm text-slate-600">Log in to save your cart across devices.</p>}
            <Link href="/login" className="mt-6 block rounded bg-brand px-4 py-2 text-center font-semibold text-white">{authenticated ? "Proceed to checkout" : "Log in to checkout"}</Link>
          </aside>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
