"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container py-12">
      <div className="rounded border bg-white p-6">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-slate-600">We could not load this page.</p>
        <button onClick={reset} className="mt-4 rounded bg-brand px-4 py-2 font-semibold text-white">Try again</button>
      </div>
    </main>
  );
}
