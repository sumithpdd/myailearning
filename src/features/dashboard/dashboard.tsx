import Link from "next/link";
import { WorkList } from "@/components/execute/work-list";
import { ModeBanner, ProgressBar } from "@/components/ui";
import { careerPath, daysLabel } from "@/lib/career";
import { upcomingGatherings } from "@/lib/item-experience";
import { formatDisplayDate, todayISO } from "@/lib/dates";
import {
  comingUp,
  formatDayHeading,
  formatMinutes,
  greeting,
  nextStep,
  overdueTasks,
  recentNotes,
  todayAgenda,
  weekStrip,
  type LinkedSession,
  type LinkedTask,
} from "@/lib/execute";
import type { Catalog } from "@/lib/notion/schema";
import type { ItemCollection, LearningMilestone } from "@/types/learning";

export function Dashboard({
  collection,
  catalog,
  tasks,
  agenda,
  milestones,
  warning,
}: {
  collection: ItemCollection;
  catalog: Catalog;
  tasks: LinkedTask[];
  agenda: LinkedSession[];
  milestones: LearningMilestone[];
  warning?: string;
}) {
  const now = new Date();
  const { items, mode } = collection;
  const today = todayAgenda(tasks, agenda, now);
  const overdue = overdueTasks(tasks, now);
  const upcoming = comingUp(tasks, agenda, now);
  const step = nextStep(tasks, agenda, items, now);
  const notes = recentNotes(items, tasks, agenda, 4);
  const week = weekStrip(tasks, agenda, now);
  const path = careerPath(items, catalog.capability);
  const gatherings = upcomingGatherings(items, now);
  const todayKey = todayISO(now);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <ModeBanner mode={mode} warning={warning || collection.warning} />
      <header>
        <p className="text-sm text-muted">{formatDayHeading(now)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{greeting(now)}</h1>
      </header>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Next best action</h2>
        {step ? (
          <div className="mt-3 border-y border-line py-4">
            {step.context ? <p className="text-sm text-muted">{step.context}</p> : null}
            <p className="text-xl font-semibold leading-7">{step.title}</p>
            <p className="mt-1 text-sm text-muted">{[formatMinutes(step.minutes), step.capability, ...step.meta].filter(Boolean).join(" · ")}</p>
            {step.line ? <p className="mt-2 text-sm leading-6">{step.line}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={step.href} className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">
                Start
              </Link>
              {step.externalUrl ? (
                <a href={step.externalUrl} className="rounded-full border border-line px-3 py-1.5 text-sm">
                  Open link
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No open task, in-progress core item, or near deadline to recommend.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Today</h2>
        {overdue.length > 0 ? (
          <div className="mt-3">
            <h3 className="text-sm font-semibold text-danger">Overdue</h3>
            <WorkList blocks={overdue} />
          </div>
        ) : null}
        <div className="mt-3">
          {today.scheduled.length > 0 ? <WorkList blocks={today.scheduled} /> : null}
          {today.scheduled.length === 0 && today.unscheduled.length > 0 ? (
            <>
              <p className="py-2 text-sm text-muted">Nothing is scheduled today. These open tasks have no date.</p>
              <WorkList blocks={today.unscheduled} />
            </>
          ) : null}
          {today.scheduled.length === 0 && today.unscheduled.length === 0 && overdue.length === 0 ? (
            <p className="py-3 text-sm text-muted">No tasks for today. Use + to add one.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Coming up</h2>
          <Link href="/tasks?view=upcoming" className="text-sm text-accent">
            Tasks
          </Link>
        </div>
        {gatherings.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {gatherings.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link href={`/learning/${item.id}`} className="font-medium hover:text-accent">
                  {item.name}
                </Link>
                <p className="text-sm text-muted">{[daysLabel(item, now), formatDisplayDate(item.startDate), item.location].filter(Boolean).join(" · ")}</p>
              </li>
            ))}
          </ul>
        ) : null}
        <WorkList blocks={upcoming} empty={gatherings.length > 0 ? "No other dated work in the next two weeks." : "Nothing dated in the next two weeks."} />
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Career momentum</h2>
          <Link href="/career" className="text-sm text-accent">
            Career
          </Link>
        </div>
        {path.length === 0 ? <p className="mt-3 text-sm text-muted">Capability progress appears once learning items have a capability.</p> : null}
        <ul className="mt-3 space-y-3">
          {path.map((entry) => (
            <li key={entry.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{entry.name}</span>
                <span className="text-muted">{entry.progress}</span>
              </div>
              <div className="mt-1">
                <ProgressBar value={ladderPercent(entry.progress)} />
              </div>
            </li>
          ))}
        </ul>
        {milestones[0] ? (
          <p className="mt-3 text-sm text-muted">
            Next milestone: {milestones[0].name}
            {milestones[0].target ? ` · ${formatDisplayDate(milestones[0].target)}` : ""}
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">This week</h2>
        <ol className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
          {week.map((day) => (
            <li key={day.date} className={day.date === todayKey ? "rounded-lg bg-accent/10 py-2" : "py-2"}>
              <p className="text-muted">{day.label}</p>
              <p className="mt-1 text-sm font-semibold">{day.count || "·"}</p>
            </li>
          ))}
        </ol>
        <WeekHours items={items} weekStart={week[0]?.date} weekEnd={week[6]?.date} />
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Recent notes</h2>
          <Link href="/notes" className="text-sm text-accent">
            All notes
          </Link>
        </div>
        {notes.length === 0 ? <p className="mt-3 text-sm text-muted">Notes from learning items, tasks, and sessions show up here.</p> : null}
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {notes.map((note) => (
            <li key={`${note.kind}-${note.id}`} className="py-3">
              <Link href={note.href} className="font-medium hover:text-accent">
                {note.title}
              </Link>
              <p className="text-sm text-muted">
                {note.parentName}
                {note.date ? ` · ${formatDisplayDate(note.date)}` : ""}
              </p>
              <p className="mt-1 line-clamp-3 text-sm leading-6">{note.preview}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function WeekHours({ items, weekStart, weekEnd }: { items: ItemCollection["items"]; weekStart?: string; weekEnd?: string }) {
  if (!weekStart || !weekEnd) return null;
  const inWeek = items.filter((item) => {
    const points = [item.startDate, item.endDate, item.deadline, item.reviewDate].filter(Boolean) as string[];
    return points.some((value) => value.slice(0, 10) >= weekStart && value.slice(0, 10) <= weekEnd);
  });
  const planned = inWeek.reduce((sum, item) => sum + (item.plannedHours || 0), 0);
  const completed = inWeek.reduce((sum, item) => sum + (item.actualHours || 0), 0);
  if (!planned && !completed) {
    return <p className="mt-3 text-sm text-muted">No planned or actual hours on this week’s learning items.</p>;
  }
  return (
    <p className="mt-3 text-sm text-muted">
      Planned {planned}h · Completed {completed}h · Remaining {Math.max(0, planned - completed)}h
    </p>
  );
}

function ladderPercent(progress: string): number {
  const key = progress.toLowerCase();
  if (key === "expert") return 100;
  if (key === "applied") return 75;
  if (key === "working") return 50;
  if (key === "beginner") return 25;
  return 0;
}

