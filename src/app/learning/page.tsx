import { Suspense } from "react";
import Link from "next/link";
import { ItemBrowser } from "@/components/learning/item-browser";
import { PageFrame } from "@/components/ui";
import { listItems } from "@/lib/repository";

export const metadata = { title: "Learning" };

export default async function LearningPage() {
  const collection = await listItems();
  return (
    <PageFrame
      title="Learning"
      lede="Search the plan, then keep the core path in front of the catalogue."
      action={
        <Link href="/learning/new" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
          New item
        </Link>
      }
    >
      <Suspense fallback={<p className="text-sm text-muted">Loading filters…</p>}>
        <ItemBrowser
          items={collection.items}
          mode={collection.mode}
          warning={collection.warning}
          readOnly={collection.readOnly}
          basePath="/learning"
        />
      </Suspense>
    </PageFrame>
  );
}
