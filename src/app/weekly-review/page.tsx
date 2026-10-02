import Link from "next/link";
import { ModeBanner, PageFrame } from "@/components/ui";
import { ReviewForm } from "@/features/weekly-review/review-form";
import { formatDisplayDate, formatISODate, formatWeekLabel, startOfWeek } from "@/lib/dates";
import { readReflections } from "@/lib/demo/store";
import { listItems } from "@/lib/repository";
import { buildWeeklyReport, shiftWeek } from "@/lib/weekly";

export const metadata = { title: "Weekly review" };

export default async function WeeklyReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const current = formatISODate(startOfWeek(new Date()));
  const week = /^\d{4}-\d{2}-\d{2}$/.test(params.week || "") ? (params.week as string) : current;
  const collection = await listItems();
  const report = buildWeeklyReport(collection.items, week);
  const reflection = readReflections()[week];

  return (
    <PageFrame
      title="Weekly review"
      lede={formatWeekLabel(week)}
      action={
        <div className="flex gap-2 text-sm">
          <Link className="rounded-full border border-line px-3 py-2" href={`/weekly-review?week=${shiftWeek(week, -1)}`}>
            Previous
          </Link>
          <Link className="rounded-full border border-line px-3 py-2" href={`/weekly-review?week=${shiftWeek(week, 1)}`}>
            Next
          </Link>
        </div>
      }
    >
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="What did I complete?" items={report.completed} empty="Nothing marked completed in this week’s dates." />
        <Block title="What did I attend?" items={report.attended} empty="No events on this week’s calendar." />
        <Block title="What's coming next week?" items={report.coming} empty="Next week is clear of dated items." />
        <Block title="What deadlines are approaching?" items={report.deadlines} empty="No deadlines in the next three weeks from this Monday." />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-elev p-4">
          <h2 className="font-serif text-2xl">What should I focus on?</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.focus.map((entry) => (
              <li key={entry.item.id}>
                <Link href={`/learning/${entry.item.id}`} className="font-medium hover:text-accent">
                  {entry.item.name}
                </Link>
                <p className="text-muted">{entry.reasons.join(" · ")}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-line bg-elev p-4">
          <h2 className="font-serif text-2xl">What should I skip or defer?</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {report.defer.map((entry) => (
              <li key={entry.item.id}>
                <span className="font-medium">{entry.item.name}.</span> {entry.reason}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="mt-4 rounded-2xl border border-line bg-elev p-4">
        <h2 className="font-serif text-2xl">Am I on track?</h2>
        <p className="mt-2 text-sm leading-6">{report.pace.summary}</p>
        <p className="mt-2 text-sm text-muted">Finish line {formatDisplayDate(report.finish)} · {report.pace.daysRemaining} days left · core path {report.pace.corePercent}%.</p>
      </section>
      <section className="mt-4">
        <h2 className="mb-3 font-serif text-2xl">What did I learn?</h2>
        <ReviewForm weekStart={week} initial={reflection} />
        <p className="mt-2 text-xs text-muted">Reflections stay in .data/weekly-reviews.json on this machine. They are not written into the Notion tracker.</p>
      </section>
    </PageFrame>
  );
}

function Block({ title, items, empty }: { title: string; items: { id: string; name: string; status: string }[]; empty: string }) {
  return (
    <section className="rounded-2xl border border-line bg-elev p-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/learning/${item.id}`} className="hover:text-accent">
                {item.name}
              </Link>
              <span className="text-muted"> · {item.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
