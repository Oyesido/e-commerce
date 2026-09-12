"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
    });
    if (!response.ok) {
      const body = await response.json();
      setError(typeof body.error === "string" ? body.error : "Could not create account.");
      return;
    }
    router.push("/login");
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded border bg-white p-6">
      <input name="name" required minLength={2} placeholder="Full name" className="w-full rounded border px-3 py-2" />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded border px-3 py-2" />
      <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" className="w-full rounded border px-3 py-2" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="w-full rounded bg-brand px-4 py-2 font-semibold text-white">Register</button>
    </form>
  );
}
