"use client";

import { FormEvent, useState } from "react";

type Category = { id: string; name: string; _count?: { products: number } };

export function AdminCategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const body = await response.json();
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "Could not create category.");
      return;
    }
    setCategories((current) => [...current, body].sort((a, b) => a.name.localeCompare(b.name)));
    form.reset();
  }

  async function remove(id: string) {
    setError("");
    const response = await fetch("/api/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Could not delete category.");
      return;
    }
    setCategories((current) => current.filter((category) => category.id !== id));
  }

  async function rename(category: Category) {
    const name = window.prompt("Category name", category.name)?.trim();
    if (!name || name === category.name) return;
    setError("");
    const response = await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: category.id, name })
    });
    const body = await response.json();
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "Could not rename category.");
      return;
    }
    setCategories((current) => current.map((item) => item.id === category.id ? { ...item, name: body.name } : item).sort((a, b) => a.name.localeCompare(b.name)));
  }

  return (
    <section className="rounded border bg-white p-6">
      <h2 className="text-xl font-semibold">Categories</h2>
      <form onSubmit={create} className="mt-4 flex gap-2">
        <input name="name" required minLength={2} placeholder="New category" className="min-w-0 flex-1 rounded border px-3 py-2" />
        <button className="rounded bg-brand px-4 py-2 font-semibold text-white">Add</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <ul className="mt-4 divide-y">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between py-3">
            <span>{category.name} <span className="text-sm text-slate-500">({category._count?.products ?? 0})</span></span>
            <div className="flex gap-3">
              <button type="button" onClick={() => void rename(category)} className="text-sm">Rename</button>
              <button type="button" onClick={() => void remove(category.id)} className="text-sm text-red-700">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
