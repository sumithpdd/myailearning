import Link from "next/link";
import { ModeBanner, PageFrame } from "@/components/ui";
import { formatDisplayDate } from "@/lib/dates";
import { attentionList, effectiveHorizon, horizonIsSuggested, hourTotals, nearTermItems, nextLearning } from "@/lib/plan";
import { listCatalog, listItems } from "@/lib/repository";
import type { LearningItem } from "@/types/learning";

export const metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  const [collection, catalog] = await Promise.all([listItems(), listCatalog()]);
  const items = collection.items;
  const horizons = [...catalog.horizon];
  for (const item of items) {
    const horizon = effectiveHorizon(item);
    if (horizon && !horizons.includes(horizon)) horizons.push(horizon);
  }
  const near = nearTermItems(items);
  const hours = hourTotals(near);
  const slipping = attentionList(items);
  const next = nextLearning(items);
  const important = near.filter((item) => item.priority === "Core" || item.priority === "High");

  return (
    <PageFrame
      eyebrow="Learning plan"
      title="Roadmap"
      lede="What you marked important, where the time is going, what keeps slipping, and what should take the next block."
    >
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Summary title="Important now" body={`${important.length} Core or High items sit in Now or the next 3 months.`} />
        <Summary title="Time spent" body={hours.planned || hours.actual ? `${hours.actual}h recorded against ${hours.planned}h planned in that window.` : "Planned and actual hours are still empty on these rows."} />
        <Summary title="Slipping" body={slipping.length ? `${slipping.length} items need attention. The reason is on the card.` : "Nothing in the open plan is flagged as slipping."} />
        <Summary title="Next" body={next[0] ? next.map((entry) => entry.item.name).slice(0, 3).join(" · ") : "No open item is ready for a time block."} />
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Needs attention</h2>
        {slipping.length === 0 ? <p className="mt-2 text-sm text-muted">At-risk rows, blockers, missed reviews, and stale learning show up here.</p> : null}
        <div className="mt-3 space-y-3">
          {slipping.slice(0, 12).map(({ item, reasons }) => (
            <article key={item.id} className="rounded-2xl border border-warn/40 bg-elev p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/learning/${item.id}`} className="font-medium hover:text-accent">
                  {item.name}
                </Link>
                <span className="text-xs text-muted">{[item.momentum, item.horizon || (horizonIsSuggested(item) ? `Suggested ${effectiveHorizon(item)}` : "")].filter(Boolean).join(" · ")}</span>
              </div>
              <p className="mt-2 text-sm">{reasons.join(" · ")}</p>
              <p className="mt-2 text-sm text-muted">
                Last learning {formatDisplayDate(item.lastLearning)} · Review {formatDisplayDate(item.reviewDate)}
                {item.nextAction ? ` · Next: ${item.nextAction}` : ""}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Horizons</h2>
        <p className="mt-2 text-sm text-muted">A horizon already stored in Notion is used as-is. An empty horizon is suggested from status, dates, and priority.</p>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {horizons.map((horizon) => {
            const column = items.filter((item) => effectiveHorizon(item) === horizon);
            return (
              <div key={horizon} className="w-72 shrink-0 rounded-2xl border border-line bg-canvas p-3">
                <h3 className="font-serif text-xl">{horizon}</h3>
                <p className="text-xs text-muted">{column.length}</p>
                <div className="mt-3 space-y-2">
                  {column.map((item) => (
                    <RoadCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PageFrame>
  );
}

function Summary({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-line bg-elev p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <p className="mt-2 text-sm leading-6">{body}</p>
    </section>
  );
}

function RoadCard({ item }: { item: LearningItem }) {
  return (
    <article className="rounded-xl border border-line bg-elev p-3">
      <Link href={`/learning/${item.id}`} className="font-medium hover:text-accent">
        {item.name}
      </Link>
      <p className="mt-1 text-xs text-muted">
        {[item.priority, item.type, horizonIsSuggested(item) ? "suggested" : ""].filter(Boolean).join(" · ")}
      </p>
      {item.why ? <p className="mt-2 text-sm leading-5">{item.why}</p> : null}
      {item.nextAction ? <p className="mt-2 text-sm text-muted">Next: {item.nextAction}</p> : null}
    </article>
  );
}
