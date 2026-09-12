"use client";

import { useState } from "react";
import { addGuestItem } from "./cart/CartClient";

export function AddToCartButton({ productId, stock, disabled = false }: { productId: string; stock: number; disabled?: boolean }) {
  const [added, setAdded] = useState(false);

  async function add() {
    const sessionResponse = await fetch("/api/auth/session");
    const session = await sessionResponse.json();
    if (session?.user) {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 })
      });
      if (!response.ok) return;
    } else {
      addGuestItem(productId, 1, stock);
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button type="button" disabled={disabled} onClick={() => void add()} className="rounded bg-brand px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
      {added ? "Added" : disabled ? "Out of stock" : "Add to cart"}
    </button>
  );
}
