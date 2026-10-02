import Link from "next/link";
import { LearningCard } from "@/components/learning/cards";
import { Badge, ModeBanner, ProgressBar } from "@/components/ui";
import { FINISH_LINE, TRACKS, isEventType } from "@/lib/constants";
import { deferrals, evidenceGaps, focusList } from "@/lib/focus";
import { formatDateRange, formatDisplayDate, todayISO } from "@/lib/dates";
import { assessPace, counts, progressByTrack, weekLoads } from "@/lib/progress";
import type { ItemCollection } from "@/types/learning";

export function Dashboard({ collection }: { collection: ItemCollection }) {
  const { items, mode, warning } = collection;
  const pace = assessPace(items);
  const stats = counts(items);
  const tracks = progressByTrack(items, TRACKS);
  const focus = focusList(items, new Date(), 4);
  const later = deferrals(items, new Date(), [], 3);
  const weeks = weekLoads(items, new Date(), 6).filter((week) => week.heavy);
  const today = todayISO();
  const featured = items
    .filter((item) => isEventType(item.type) && (item.status === "Going" || item.status === "Confirmed") && (item.endDate || item.startDate || "") >= today)
    .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""))[0];
  const gaps = evidenceGaps(items).slice(0, 4);
  const queuedCore = items.filter((item) => item.priority === "Core" && !["Completed", "Attended", "Skipped"].includes(item.status)).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <ModeBanner mode={mode} warning={warning} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Personal learning system</p>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">My AI Learning</h1>
          <p className="mt-2 text-muted">Finish line: {formatDisplayDate(FINISH_LINE)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-elev px-5 py-4">
          <p className="font-serif text-4xl leading-none">{pace.daysRemaining}</p>
          <p className="mt-1 text-sm text-muted">days remaining</p>
        </div>
      </header>

      <p className="mt-4 max-w-3xl text-sm leading-6">{pace.summary}</p>
      <div className="mt-3 max-w-xl">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Core path {pace.corePercent}%</span>
          <span>Calendar pace {pace.expectedPercent}%</span>
        </div>
        <ProgressBar value={pace.corePercent} />
      </div>

      {stats.expiringItems.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-warn/40 bg-warn/10 p-4">
          <h2 className="font-serif text-2xl">Deadlines in the next 21 days</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {stats.expiringItems.map((item) => (
              <li key={item.id}>
                <Link className="font-medium hover:text-accent" href={`/learning/${item.id}`}>
                  {item.name}
                </Link>
                <span className="text-muted"> · {formatDisplayDate(item.deadline)} · {item.priority}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {featured ? (
        <Link href="/going" className="mt-4 block rounded-2xl border border-accent/30 bg-elev p-4 hover:border-accent">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">From the tracker</p>
              <h2 className="font-serif text-2xl">{featured.name}</h2>
            </div>
            <Badge tone="going">{featured.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            {featured.startDate ? formatDateRange(featured.startDate, featured.endDate) : "Dates in the tracker"}
            {featured.nextAction ? ` · ${featured.nextAction}` : ""}
          </p>
        </Link>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi href="/learning?shelf=active" label="Active learning" value={stats.active} hint="In progress, going, or confirmed" />
        <Kpi href="/learning?priority=Core" label="Core items remaining" value={stats.coreRemaining} hint={`${queuedCore} still on the core path`} />
        <Kpi href="/learning?priority=High" label="High-priority items" value={stats.high} hint="Not completed" />
        <Kpi href="/events?upcoming=1" label="Upcoming events" value={stats.upcoming} hint="Not skipped" />
        <Kpi href="/learning?status=Completed" label="Completed" value={stats.completed} hint="Marked completed" />
        <Kpi href="/learning?status=Attended" label="Attended" value={stats.attended} hint="Marked attended" />
        <Kpi href="/learning?expiring=1" label="Expiring soon" value={stats.expiring} hint="Deadline within 21 days" />
        <Kpi href="/learning?overdue=1" label="Overdue" value={stats.overdue} hint="Deadline has passed" />
        <Kpi href="/path" label="Days until the finish line" value={stats.daysRemaining} hint={pace.status === "behind" ? "Core pace is behind" : "Check the path"} />
      </section>

      {stats.staleGoing.length > 0 ? (
        <p className="mt-4 text-sm text-warn">
          {stats.staleGoing.length} event{stats.staleGoing.length === 1 ? " is" : "s are"} still marked Going after the date. Mark them Attended once the notes exist.
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Progress by track</h2>
        <div className="mt-4 space-y-3">
          {tracks.map((track) => (
            <div key={track.id} className="grid items-center gap-2 sm:grid-cols-[11rem_1fr_auto]">
              <div>
                <p className="text-sm font-medium">{track.label}</p>
                <p className="text-xs text-muted">
                  {track.done}/{track.counted} done
                </p>
              </div>
              <ProgressBar value={track.percent} />
              <p className="text-sm tabular-nums">{track.percent}%</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">What should I focus on now?</h2>
            <Link href="/focus" className="text-sm text-accent">
              Open focus
            </Link>
          </div>
          <div className="space-y-3">
            {focus.map((entry) => (
              <Link key={entry.item.id} href={`/learning/${entry.item.id}`} className="block rounded-2xl border border-line bg-elev p-4">
                <p className="font-medium">{entry.item.name}</p>
                <p className="mt-1 text-sm text-muted">{entry.reasons.join(" · ")}</p>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-serif text-2xl">Suggested to defer</h2>
          <div className="space-y-3">
            {later.map((entry) => (
              <div key={entry.item.id} className="rounded-2xl border border-line bg-elev p-4">
                <p className="font-medium">{entry.item.name}</p>
                <p className="mt-1 text-sm text-muted">{entry.reason}</p>
              </div>
            ))}
            {weeks.length > 0 ? (
              <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm">
                <p className="font-semibold">Heavy week</p>
                <ul className="mt-2 space-y-1">
                  {weeks.map((week) => (
                    <li key={week.weekStart}>
                      {week.label}: {week.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {gaps.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">Evidence still missing</h2>
          <p className="mt-1 text-sm text-muted">Started or finished without a tangible artifact.</p>
          <ul className="mt-3 space-y-1 text-sm">
            {gaps.map((item) => (
              <li key={item.id}>
                <Link className="hover:text-accent" href={`/learning/${item.id}`}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-2xl">Coming up</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stats.upcomingItems.slice(0, 3).map((item) => (
            <LearningCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ href, label, value, hint }: { href: string; label: string; value: number; hint: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-elev p-4 hover:border-accent">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </Link>
  );
}
