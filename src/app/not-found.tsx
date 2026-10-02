import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-serif text-3xl">Not in the plan</h1>
      <p className="mt-3 text-sm text-muted">That learning item is missing, archived, or from another mode.</p>
      <Link href="/learning" className="mt-4 inline-block text-sm font-semibold text-accent">
        Back to learning
      </Link>
    </div>
  );
}
