import { Suspense } from "react";
import Link from "next/link";
import { ItemBrowser } from "@/components/learning/item-browser";
import { PageFrame } from "@/components/ui";
import { taskHints } from "@/lib/execute";
import { listCatalog, listWork } from "@/lib/repository";

export const metadata = { title: "Learning" };

export default async function LearningPage() {
  const [work, catalog] = await Promise.all([listWork(), listCatalog()]);
  const collection = { items: work.items, mode: work.mode, readOnly: work.readOnly, warning: work.warning };
  return (
    <PageFrame
      title="Learning"
      lede="What you are learning. Open an item for the full record."
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
          catalog={catalog}
          hints={taskHints(work.tasks)}
        />
      </Suspense>
    </PageFrame>
  );
}
