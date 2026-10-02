import { Suspense } from "react";
import { ItemBrowser } from "@/components/learning/item-browser";
import { PageFrame } from "@/components/ui";
import { isEventType } from "@/lib/constants";
import { listItems } from "@/lib/repository";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const collection = await listItems();
  const events = collection.items.filter((item) => isEventType(item.type));
  return (
    <PageFrame title="Events" lede="Conferences, workshops, and webinars. A going event should replace a study block, not sit on top of one.">
      <Suspense fallback={<p className="text-sm text-muted">Loading events…</p>}>
        <ItemBrowser
          items={events}
          mode={collection.mode}
          warning={collection.warning}
          readOnly={collection.readOnly}
          basePath="/events"
          defaultSort="date"
        />
      </Suspense>
    </PageFrame>
  );
}
