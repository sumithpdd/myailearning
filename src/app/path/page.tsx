import Link from "next/link";
import { ModeBanner, PageFrame, ProgressBar } from "@/components/ui";
import { FINISH_LINE, WEEKLY_HOURS_MAX, WEEKLY_HOURS_MIN, isTerminalStatus } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/dates";
import { assessPace, progressByTrack } from "@/lib/progress";
import { listCatalog, listItems } from "@/lib/repository";
import type { LearningItem } from "@/types/learning";

export const metadata = { title: "AI Expert Path" };

export default async function PathPage() {
  const [collection, catalog] = await Promise.all([listItems(), listCatalog()]);
  const pace = assessPace(collection.items);
  const tracks = progressByTrack(
    collection.items,
    catalog.track.map((track) => ({ id: track, label: track })),
  );

  return (
    <PageFrame
      eyebrow={`Finish line ${formatDisplayDate(FINISH_LINE)}`}
      title="AI Expert Path"
      lede={`What to learn next comes from the tracker. The finish line is ${formatDisplayDate(FINISH_LINE)}.`}
    >
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <p className="max-w-3xl text-sm leading-6">
        Discover, decide, learn, apply, produce evidence, then review. Depth beats collection. Target about {WEEKLY_HOURS_MIN}–{WEEKLY_HOURS_MAX} focused hours a week outside events. Events replace study blocks. Core outranks High, then Medium, then Optional.
      </p>
      <section className="mt-8">
        <h2 className="font-serif text-2xl">Where the path stands</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">{pace.summary}</p>
        <div className="mt-4 space-y-3">
          {tracks.map((track) => (
            <div key={track.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{track.label}</span>
                <span>{track.percent}%</span>
              </div>
              <ProgressBar value={track.percent} />
            </div>
          ))}
        </div>
      </section>
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <ItemList title="Core in the tracker" items={collection.items.filter((item) => item.priority === "Core" && !isTerminalStatus(item.status))} />
        <ItemList title="Optional in the tracker" items={collection.items.filter((item) => item.priority === "Optional" && !isTerminalStatus(item.status))} />
      </section>
    </PageFrame>
  );
}

function ItemList({ title, items }: { title: string; items: LearningItem[] }) {
  const shown = items.slice(0, 8);
  return (
    <article className="rounded-2xl border border-line bg-elev p-4 text-sm leading-6">
      <h2 className="font-serif text-2xl">{title}</h2>
      {shown.length === 0 ? <p className="mt-2 text-muted">Nothing in the tracker with this priority.</p> : null}
      <ul className="mt-3 space-y-2">
        {shown.map((item) => (
          <li key={item.id}>
            <Link href={`/learning/${item.id}`} className="hover:text-accent">
              {item.name}
            </Link>
            <span className="text-muted"> · {item.status}</span>
          </li>
        ))}
      </ul>
      <Link href="/focus" className="mt-3 inline-block text-accent">
        Open this week’s focus
      </Link>
    </article>
  );
}
