export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-line" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-2xl bg-line" />
        <div className="h-24 animate-pulse rounded-2xl bg-line" />
        <div className="h-24 animate-pulse rounded-2xl bg-line" />
      </div>
    </div>
  );
}
