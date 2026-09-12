"use client";

import { FormEvent, useState } from "react";
import { signIn, signOut } from "next-auth/react";

export function LoginForm() {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const result = await signIn("credentials", { ...values, redirect: false });
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    try {
      const rawCart = window.localStorage.getItem("markethub-cart");
      const items = rawCart ? JSON.parse(rawCart) : [];
      if (Array.isArray(items) && items.length > 0) {
        const mergeResponse = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items })
        });
        if (!mergeResponse.ok) {
          const body = await mergeResponse.json();
          setError(body.error ?? "Could not merge your guest cart.");
          return;
        }
        window.localStorage.removeItem("markethub-cart");
      }
      window.location.href = "/";
    } catch {
      setError("Could not merge your guest cart.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded border bg-white p-6">
      <input name="email" type="email" required placeholder="Email" className="w-full rounded border px-3 py-2" />
      <input name="password" type="password" required placeholder="Password" className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="w-full rounded bg-brand px-4 py-2 font-semibold text-white">Log in</button>
      <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="w-full rounded border px-4 py-2">Log out</button>
    </form>
  );
}
