import Link from "next/link";
import { ModeBanner, PageFrame } from "@/components/ui";
import { deferrals, focusList, laterDecisions } from "@/lib/focus";
import { assessPace, weekLoads } from "@/lib/progress";
import { listItems } from "@/lib/repository";

export const metadata = { title: "Focus" };

export default async function FocusPage() {
  const collection = await listItems();
  const focus = focusList(collection.items, new Date(), 6);
  const deferred = deferrals(collection.items, new Date(), [], 6);
  const later = laterDecisions(collection.items);
  const heavy = weekLoads(collection.items, new Date(), 8).filter((week) => week.heavy);
  const pace = assessPace(collection.items);
  const coreLeft = collection.items.filter((item) => item.priority === "Core" && !["Completed", "Attended", "Skipped"].includes(item.status)).length;

  return (
    <PageFrame
      eyebrow="Depth over collection"
      title="What should I focus on now?"
      lede="Five slots, not the whole catalogue. Core and dated commitments outrank events that merely exist."
    >
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <p className="mb-6 max-w-3xl text-sm leading-6">{pace.summary}</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,1fr)]">
        <section className="space-y-3">
          {focus.map((entry, index) => (
            <Link key={entry.item.id} href={`/learning/${entry.item.id}`} className="block rounded-2xl border border-line bg-elev p-4">
              <p className="text-xs uppercase tracking-wide text-muted">0{index + 1}</p>
              <h2 className="font-serif text-2xl">{entry.item.name}</h2>
              <p className="mt-1 text-sm text-muted">{entry.reasons.join(" · ")}</p>
              {entry.item.nextAction ? <p className="mt-2 text-sm">Next: {entry.item.nextAction}</p> : null}
            </Link>
          ))}
          {coreLeft > focus.length ? (
            <p className="text-sm text-muted">{coreLeft - focus.filter((entry) => entry.item.priority === "Core").length} more core items are queued. They are not all this week’s work.</p>
          ) : null}
        </section>
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-elev p-4">
            <h2 className="font-serif text-2xl">Suggested to defer</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {deferred.map((entry) => (
                <li key={entry.item.id}>
                  <Link href={`/learning/${entry.item.id}`} className="font-medium hover:text-accent">
                    {entry.item.name}
                  </Link>
                  <p className="text-muted">{entry.reason}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-line bg-elev p-4">
            <h2 className="font-serif text-2xl">Decide later</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {later.map((item) => (
                <li key={item.id}>
                  <Link href={`/learning/${item.id}`} className="hover:text-accent">
                    {item.name}
                  </Link>
                  <span className="text-muted"> · {item.priority}</span>
                </li>
              ))}
            </ul>
          </section>
          {heavy.length > 0 ? (
            <section className="rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm">
              <h2 className="font-serif text-2xl">Heavy weeks</h2>
              <ul className="mt-3 space-y-2">
                {heavy.map((week) => (
                  <li key={week.weekStart}>
                    <span className="font-medium">{week.label}.</span> {week.reason}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </PageFrame>
  );
}
