import Link from "next/link";
import { WorkList } from "@/components/execute/work-list";
import { ModeBanner, ProgressBar } from "@/components/ui";
import { careerPath } from "@/lib/career";
import { formatDisplayDate, todayISO } from "@/lib/dates";
import {
  approachingDeadlines,
  comingUp,
  currentFocus,
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
import type { ItemCollection } from "@/types/learning";

export function Dashboard({
  collection,
  catalog,
  tasks,
  agenda,
  warning,
}: {
  collection: ItemCollection;
  catalog: Catalog;
  tasks: LinkedTask[];
  agenda: LinkedSession[];
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
  const deadlines = approachingDeadlines(items, now);
  const focus = currentFocus(items, step);
  const path = careerPath(items, catalog.capability);
  const planned = [...today.scheduled, ...overdue].reduce((sum, block) => sum + (block.durationMinutes || 0), 0);
  const openToday = today.scheduled.filter((block) => !block.completed).length + overdue.length;
  const todayKey = todayISO(now);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <ModeBanner mode={mode} warning={warning || collection.warning} />
      <header>
        <p className="text-sm text-muted">{formatDayHeading(now)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{greeting(now)}</h1>
        <p className="mt-2 text-sm text-muted">
          {[
            openToday ? `${openToday} open today` : "Nothing scheduled today",
            planned ? `${formatMinutes(planned)} planned` : "",
            deadlines.length ? `${deadlines.length} deadline${deadlines.length === 1 ? "" : "s"} approaching` : "",
            focus ? `${focus} is the current focus` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

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
        <p className="mt-2 text-xs text-muted">Task duration is not a Notion field. A length appears only when a session has a start and an end.</p>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Next up</h2>
        {step ? (
          <div className="mt-3 border-y border-line py-4">
            {step.context ? <p className="text-sm text-muted">{step.context}</p> : null}
            <p className="text-xl font-semibold leading-7">{step.title}</p>
            <p className="mt-1 text-sm text-muted">{[formatMinutes(step.minutes), ...step.meta].filter(Boolean).join(" · ")}</p>
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
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Coming up</h2>
          <Link href="/tasks?view=upcoming" className="text-sm text-accent">
            Tasks
          </Link>
        </div>
        <WorkList blocks={upcoming} empty="Nothing dated in the next two weeks." />
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Milestones</h2>
          <Link href="/milestones" className="text-sm text-accent">
            Path
          </Link>
        </div>
        {path.length === 0 ? <p className="mt-3 text-sm text-muted">Capabilities appear here once they exist on the learning plan.</p> : null}
        <ul className="mt-3 space-y-3">
          {path.map((entry) => (
            <li key={entry.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <Link href={`/milestones#${slug(entry.name)}`} className="font-medium hover:text-accent">
                  {entry.name}
                </Link>
                <span className="text-muted">{entry.progress}</span>
              </div>
              <div className="mt-1">
                <ProgressBar value={ladderPercent(entry.progress)} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">These bars are Career Progress. Target dates and success criteria are not stored yet.</p>
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

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
