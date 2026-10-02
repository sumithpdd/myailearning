"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-serif text-3xl">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">{error.message || "The page could not be loaded."}</p>
      <button type="button" className="mt-4 rounded-full bg-accent px-4 py-2 text-sm text-accent-ink" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
