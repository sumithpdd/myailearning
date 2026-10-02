import Link from "next/link";
import { ModeBanner, PageFrame } from "@/components/ui";
import { formatDateRange, formatDisplayDate, formatMonthLabel, monthKey, parseISODate } from "@/lib/dates";
import { weekLoads } from "@/lib/progress";
import { listItems } from "@/lib/repository";
import type { LearningItem } from "@/types/learning";

export const metadata = { title: "Timeline" };

export default async function TimelinePage() {
  const collection = await listItems();
  const dated = collection.items
    .filter((item) => item.startDate || item.deadline)
    .sort((a, b) => (a.startDate || a.deadline || "").localeCompare(b.startDate || b.deadline || ""));
  const groups = new Map<string, LearningItem[]>();
  for (const item of dated) {
    const key = monthKey((item.startDate || item.deadline) as string);
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  const heavy = weekLoads(collection.items, new Date(), 12).filter((week) => week.heavy);

  return (
    <PageFrame title="Learning timeline" lede="Dated items from the tracker. A multi-day event replaces study blocks for that week.">
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <div className="grid gap-4 lg:grid-cols-3">
        {calendarMonths(collection.items).map(({ year, month }) => (
          <Month key={`${year}-${month}`} year={year} month={month} items={collection.items} />
        ))}
      </div>
      {heavy.length > 0 ? (
        <p className="mt-4 text-sm text-warn">Heavy weeks: {heavy.map((week) => week.label).join(" · ")}</p>
      ) : null}
      <div className="mt-8 space-y-8">
        {[...groups.entries()].map(([key, items]) => (
          <section key={key}>
            <h2 className="font-serif text-2xl">{formatMonthLabel(key)}</h2>
            <ol className="mt-3 space-y-2">
              {items.map((item) => (
                <li key={item.id} className="grid gap-1 rounded-xl border border-line bg-elev px-4 py-3 sm:grid-cols-[9rem_1fr]">
                  <time className="text-sm text-muted">{item.startDate ? formatDateRange(item.startDate, item.endDate) : formatDisplayDate(item.deadline)}</time>
                  <div>
                    <Link href={`/learning/${item.id}`} className="font-medium hover:text-accent">
                      {item.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {item.type} · {item.status} · {item.priority}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </PageFrame>
  );
}

function calendarMonths(items: LearningItem[]): { year: number; month: number }[] {
  const keys = new Set<string>();
  for (const item of items) {
    const iso = item.startDate || item.deadline;
    if (!iso || item.status === "Skipped") continue;
    const date = parseISODate(iso);
    keys.add(`${date.getFullYear()}-${date.getMonth()}`);
  }
  return [...keys]
    .sort()
    .map((key) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month };
    });
}

function Month({ year, month, items }: { year: number; month: number; items: LearningItem[] }) {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(first);
  return (
    <section className="rounded-2xl border border-line bg-elev p-3">
      <h2 className="px-1 font-serif text-xl">{label}</h2>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: pad }).map((_, index) => (
          <div key={`pad-${index}`} />
        ))}
        {Array.from({ length: count }).map((_, index) => {
          const day = index + 1;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hits = items.filter((item) => covers(item, iso));
          return (
            <div key={iso} className={`min-h-12 rounded-md border px-1 py-1 text-left text-xs ${hits.length ? "border-accent/40 bg-accent/10" : "border-transparent"}`}>
              <div>{day}</div>
              {hits.slice(0, 2).map((item) => (
                <div key={item.id} className="truncate text-[10px] text-accent" title={item.name}>
                  {item.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function covers(item: LearningItem, iso: string): boolean {
  const start = (item.startDate || item.deadline || "").slice(0, 10);
  const end = (item.endDate || item.startDate || item.deadline || "").slice(0, 10);
  if (!start) return false;
  return iso >= start && iso <= end && item.status !== "Skipped";
}
