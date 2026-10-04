import Link from "next/link";
import { WorkList } from "@/components/execute/work-list";
import { ModeBanner } from "@/components/ui";
import { presentTasks, taskViews } from "@/lib/execute";
import { sourceGap } from "@/lib/item-experience";
import { listWork } from "@/lib/repository";

export const metadata = { title: "Tasks" };

const VIEWS = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "backlog", label: "Backlog" },
  { id: "completed", label: "Completed" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  const view: ViewId = VIEWS.some((entry) => entry.id === params.view) ? (params.view as ViewId) : "today";
  const work = await listWork();
  const groups = taskViews(work.tasks);
  const blocks = presentTasks(groups[view]);
  const gap = sourceGap(work.sources.tasks);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <ModeBanner mode={work.mode} warning={work.warning} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-2 text-sm text-muted">What to do, separate from the course or event it belongs to.</p>
      </header>
      <nav className="mt-4 flex gap-2 overflow-x-auto text-sm">
        {VIEWS.map((entry) => (
          <Link
            key={entry.id}
            href={entry.id === "today" ? "/tasks" : `/tasks?view=${entry.id}`}
            className={entry.id === view ? "rounded-full bg-ink px-3 py-1.5 text-canvas" : "rounded-full border border-line px-3 py-1.5"}
          >
            {entry.label} {gap ? "" : groups[entry.id].length}
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        {gap ? (
          <p className="text-sm text-warn">{gap}</p>
        ) : (
        <WorkList
          blocks={blocks}
          empty={
            view === "today"
              ? "No tasks due today or overdue."
              : view === "backlog"
                ? "No undated tasks."
                : view === "completed"
                  ? "No completed tasks yet."
                  : "No upcoming tasks."
          }
        />
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        A task can be completed, rescheduled, or noted. Duration shows when the task has one. The type is the Notion task type.
      </p>
    </div>
  );
}
