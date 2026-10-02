import Link from "next/link";
import { ModeBanner, PageFrame } from "@/components/ui";
import { isEventType } from "@/lib/constants";
import { formatDateRange, formatDisplayDate, mapsDirectionsUrl, mapsSearchUrl, todayISO } from "@/lib/dates";
import { listItems } from "@/lib/repository";
import type { LearningItem } from "@/types/learning";

export const metadata = { title: "Going" };

export default async function GoingPage() {
  const collection = await listItems();
  const today = todayISO();
  const current = collection.items
    .filter((item) => isCurrentEvent(item, today))
    .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));

  return (
    <PageFrame
      eyebrow="Tracker"
      title="Going"
      lede="Events marked Going or Confirmed in the tracker, plus anything else dated in the same window."
    >
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      {current.length === 0 ? <p className="text-sm text-muted">No current Going or Confirmed event in the tracker.</p> : null}
      <div className="space-y-10">
        {current.map((item) => {
          const windowEnd = item.endDate || item.startDate;
          const alongside =
            item.startDate && windowEnd
              ? collection.items
                  .filter((other) => other.id !== item.id && overlaps(other, item.startDate as string, windowEnd))
                  .sort((a, b) => (a.startDate || a.deadline || "").localeCompare(b.startDate || b.deadline || ""))
              : [];
          return (
            <section key={item.id}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {item.status} · {item.priority}
                  </p>
                  <h2 className="font-serif text-3xl">{item.name}</h2>
                </div>
                <Link href={`/learning/${item.id}`} className="rounded-full border border-line px-4 py-2 text-sm">
                  Open in tracker
                </Link>
              </div>
              <EventRecord item={item} />
              {alongside.length > 0 ? (
                <div className="mt-6">
                  <h3 className="font-serif text-2xl">Same dates in the tracker</h3>
                  <div className="mt-3 space-y-3">
                    {alongside.map((other) => (
                      <article key={other.id} className="rounded-2xl border border-line bg-elev p-4">
                        <p className="text-xs uppercase tracking-wide text-muted">
                          {other.startDate ? formatDateRange(other.startDate, other.endDate) : formatDisplayDate(other.deadline)}
                        </p>
                        <Link href={`/learning/${other.id}`} className="font-medium hover:text-accent">
                          {other.name}
                        </Link>
                        <p className="text-sm text-muted">
                          {other.type} · {other.status} · {other.priority}
                        </p>
                        {other.nextAction ? <p className="mt-2 text-sm">{other.nextAction}</p> : null}
                        {other.notes ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{other.notes}</p> : null}
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </PageFrame>
  );
}

function EventRecord({ item }: { item: LearningItem }) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="When" value={item.startDate ? formatDateRange(item.startDate, item.endDate) : "—"} />
        <Fact label="Deadline" value={formatDisplayDate(item.deadline)} />
        <Fact label="Status" value={item.status} />
        <Fact label="Provider" value={item.provider || "—"} />
      </section>
      {item.offer ? (
        <section className="rounded-2xl border border-line bg-elev p-4">
          <h2 className="font-serif text-2xl">Offer</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.offer}</p>
        </section>
      ) : null}
      {item.location ? (
        <section className="rounded-2xl border border-line bg-elev p-4">
          <h2 className="font-serif text-2xl">Location</h2>
          <p className="mt-2 text-sm">{item.location}</p>
          <p className="mt-3 flex gap-4 text-sm">
            <a className="font-semibold text-accent" href={mapsSearchUrl(item.location)} target="_blank" rel="noreferrer">
              Map
            </a>
            <a className="font-semibold text-accent" href={mapsDirectionsUrl(item.location)} target="_blank" rel="noreferrer">
              Directions
            </a>
          </p>
        </section>
      ) : null}
      {item.notes ? (
        <section className="rounded-2xl border border-line bg-elev p-4">
          <h2 className="font-serif text-2xl">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.notes}</p>
        </section>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-elev p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function isCurrentEvent(item: LearningItem, today: string): boolean {
  if (!isEventType(item.type)) return false;
  if (item.status !== "Going" && item.status !== "Confirmed") return false;
  const end = item.endDate || item.startDate;
  return Boolean(end && end >= today);
}

function overlaps(item: LearningItem, start: string, end: string): boolean {
  const itemStart = item.startDate || item.deadline;
  if (!itemStart) return false;
  const itemEnd = item.endDate || itemStart;
  return itemStart <= end && itemEnd >= start;
}
