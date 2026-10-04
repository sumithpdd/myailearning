import Link from "next/link";
import { ModeBanner, PageFrame } from "@/components/ui";
import { WEEKLY_HOURS_MAX, WEEKLY_HOURS_TARGET } from "@/lib/constants";
import { addDays, formatClock, formatISODate, startOfWeek, todayISO } from "@/lib/dates";
import { formatMinutes } from "@/lib/execute";
import { isGathering, loadMinutes } from "@/lib/item-experience";
import { listWork } from "@/lib/repository";
import type { LearningItem } from "@/types/learning";

export const metadata = { title: "This week" };

export default async function WeekPage() {
  const work = await listWork();
  const now = new Date();
  const start = startOfWeek(now);
  const today = todayISO(now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const key = formatISODate(date);
    return {
      key,
      label: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date),
      sessions: work.agenda.filter((entry) => entry.start?.slice(0, 10) === key),
      tasks: work.tasks.filter((task) => (task.when || task.due)?.slice(0, 10) === key),
      events: work.items.filter((item) => covers(item, key)),
    };
  });
  const begin = days[0]?.key || "";
  const end = days[6]?.key || "";
  const weekTasks = work.tasks.filter((task) => inRange(task.when || task.due, begin, end));
  const weekSessions = work.agenda.filter((entry) => inRange(entry.start, begin, end));
  const load = loadMinutes(weekTasks, weekSessions);
  const hours = load.total / 60;
  const backlog = work.tasks.filter((task) => !(task.when || task.due) && !["done", "skipped", "completed"].includes((task.status || "").toLowerCase()));
  const defer = [...weekTasks.filter((task) => optionalPriority(task.priority)), ...weekSessions.filter((entry) => optionalPriority(entry.priority))];

  return (
    <PageFrame
      eyebrow="Weekly plan"
      title="This week"
      lede={load.total > 0 ? `${formatMinutes(load.total)} planned from task durations and session times. Target ${WEEKLY_HOURS_TARGET}h.` : "No durations on this week’s tasks or sessions yet."}
    >
      <ModeBanner mode={work.mode} warning={work.warning} />
      {hours > WEEKLY_HOURS_MAX ? (
        <section className="mb-6 rounded-2xl border border-warn/40 bg-warn/10 p-4">
          <h2 className="text-sm font-semibold">Week overloaded</h2>
          <p className="mt-1 text-sm">Suggested to defer. Nothing is skipped automatically.</p>
          {defer.length === 0 ? <p className="mt-2 text-sm text-muted">No optional items are dated this week.</p> : null}
          <ul className="mt-2 space-y-1 text-sm">
            {defer.map((entry) => (
              <li key={entry.id}>{entry.name}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {load.groups.length > 0 ? (
        <p className="mb-4 text-sm text-muted">{load.groups.map((group) => `${group.label} ${formatMinutes(group.minutes)}`).join(" · ")}</p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => (
          <section key={day.key} className={day.key === today ? "rounded-2xl border border-accent/40 bg-accent/5 p-3" : "rounded-2xl border border-line p-3"}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{day.label}</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {day.events.map((item) => (
                <li key={item.id}>
                  <Link href={`/learning/${item.id}`} className="font-medium hover:text-accent">
                    {item.name}
                  </Link>
                  <p className="text-xs text-muted">{item.type}</p>
                </li>
              ))}
              {day.sessions.map((entry) => (
                <li key={entry.id}>
                  <p className="text-xs text-muted">{formatClock(entry.start) || "Session"}</p>
                  <Link href={entry.parentId ? `/learning/${entry.parentId}` : "/learning"} className="hover:text-accent">
                    {entry.name}
                  </Link>
                </li>
              ))}
              {day.tasks.map((task) => (
                <li key={task.id}>
                  <Link href={task.parentId ? `/learning/${task.parentId}` : "/tasks"} className="hover:text-accent">
                    {task.name}
                  </Link>
                  <p className="text-xs text-muted">{[task.priority, task.durationMinutes ? `${task.durationMinutes} min` : ""].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
              {day.events.length + day.sessions.length + day.tasks.length === 0 ? <li className="text-muted">—</li> : null}
            </ul>
          </section>
        ))}
      </div>
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Backlog</h2>
        {backlog.length === 0 ? <p className="mt-2 text-sm text-muted">No undated open tasks.</p> : null}
        <ul className="mt-2 space-y-2 text-sm">
          {backlog.map((task) => (
            <li key={task.id}>
              <Link href={task.parentId ? `/learning/${task.parentId}` : "/tasks"} className="hover:text-accent">
                {task.name}
              </Link>
              <span className="text-muted"> · {[task.priority, task.parentName].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </ul>
      </section>
    </PageFrame>
  );
}

function covers(item: LearningItem, key: string): boolean {
  if (!isGathering(item.type) || item.archived) return false;
  const start = item.startDate?.slice(0, 10);
  const end = (item.endDate || item.startDate)?.slice(0, 10);
  if (!start || !end) return false;
  return key >= start && key <= end;
}

function inRange(value: string | undefined, begin: string, end: string): boolean {
  const key = value?.slice(0, 10);
  return Boolean(key && begin && end && key >= begin && key <= end);
}

function optionalPriority(priority?: string): boolean {
  const value = (priority || "").toLowerCase();
  return value === "optional" || value === "low";
}
