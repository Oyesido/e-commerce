"use client";

import { FormEvent, useRef, useState } from "react";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  categoryId: string;
  category: Category;
};

export function ImageUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const signatureResponse = await fetch("/api/admin/cloudinary-signature", { method: "POST" });
      const signature = await signatureResponse.json();
      if (!signatureResponse.ok) throw new Error(signature.error ?? "Could not sign upload.");

      const data = new FormData();
      data.append("file", file);
      data.append("api_key", signature.apiKey);
      data.append("timestamp", String(signature.timestamp));
      data.append("signature", signature.signature);
      if (signature.uploadPreset) data.append("upload_preset", signature.uploadPreset);

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
        method: "POST",
        body: data
      });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploaded.error?.message ?? "Image upload failed.");
      onUploaded(uploaded.secure_url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium">Product image</label>
      <input type="file" accept="image/*" disabled={busy} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
      }} className="mt-1 block w-full text-sm" />
      {busy && <p className="mt-1 text-sm text-slate-500">Uploading...</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function AdminProductsClient({ initialProducts, categories }: { initialProducts: Product[]; categories: Category[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [images, setImages] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, images, price: Number(values.price), stock: Number(values.stock) })
    });
    const body = await response.json();
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "Could not create product.");
      return;
    }
    setProducts((current) => editingId
      ? current.map((product) => product.id === editingId ? body : product)
      : [body, ...current]);
    setImages([]);
    setEditingId(null);
    event.currentTarget.reset();
    setMessage(editingId ? "Product updated." : "Product created.");
  }

  async function remove(id: string) {
    setError("");
    const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Could not delete product.");
      return;
    }

    function edit(product: Product) {
      const form = formRef.current;
      if (!form) return;
      (form.elements.namedItem("name") as HTMLInputElement).value = product.name;
      (form.elements.namedItem("description") as HTMLTextAreaElement).value = product.description;
      (form.elements.namedItem("price") as HTMLInputElement).value = String(product.price);
      (form.elements.namedItem("stock") as HTMLInputElement).value = String(product.stock);
      (form.elements.namedItem("categoryId") as HTMLSelectElement).value = product.categoryId;
      setImages(product.images);
      setEditingId(product.id);
      setMessage("");
      setError("");
    }
    setProducts((current) => current.filter((product) => product.id !== id));
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
      <form ref={formRef} onSubmit={submit} className="space-y-4 rounded border bg-white p-6">
        <h2 className="text-xl font-semibold">{editingId ? "Edit product" : "Add product"}</h2>
        <input name="name" required placeholder="Name" className="w-full rounded border px-3 py-2" />
        <textarea name="description" required placeholder="Description" rows={5} className="w-full rounded border px-3 py-2" />
        <input name="price" required min="0" type="number" placeholder="Price in kobo" className="w-full rounded border px-3 py-2" />
        <input name="stock" required min="0" type="number" placeholder="Stock" className="w-full rounded border px-3 py-2" />
        <select name="categoryId" required className="w-full rounded border px-3 py-2">
          <option value="">Select category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <ImageUploader onUploaded={(url) => setImages((current) => [...current, url])} />
        {images.length > 0 && <div className="grid grid-cols-3 gap-2">{images.map((image) => <img key={image} src={image} alt="" className="h-20 w-full rounded object-cover" />)}</div>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <div className="flex gap-2">
          <button className="flex-1 rounded bg-brand px-4 py-2 font-semibold text-white">{editingId ? "Save changes" : "Create product"}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setImages([]); formRef.current?.reset(); }} className="rounded border px-4 py-2">Cancel</button>}
        </div>
      </form>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Products</h2>
        {products.map((product) => (
          <div key={product.id} className="flex items-center gap-4 rounded border bg-white p-4">
            {product.images[0] ? <img src={product.images[0]} alt="" className="h-20 w-20 rounded object-cover" /> : <div className="h-20 w-20 rounded bg-slate-100" />}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-slate-600">{product.category.name} · ₦{(product.price / 100).toFixed(2)} · {product.stock} in stock</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => edit(product)} className="rounded border px-3 py-2 text-sm">Edit</button>
              <button type="button" onClick={() => void remove(product.id)} className="rounded border px-3 py-2 text-sm text-red-700">Delete</button>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="rounded border bg-white p-6 text-slate-600">No products yet.</p>}
      </div>
    </div>
  );
}
