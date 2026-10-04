"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Badge, priorityTone, ProgressBar, statusTone } from "@/components/ui";
import { captureNote, createTask, removeItem, saveAgenda, saveItem, saveTask } from "@/lib/client-api";
import { formatClock, formatDateRange, formatDisplayDate, formatSessionWhen, mapsDirectionsUrl, mapsSearchUrl } from "@/lib/dates";
import { noteLabels } from "@/lib/execute";
import { relatedItems } from "@/lib/filters";
import {
  dayParts,
  evidenceNeeded,
  isGathering,
  nextMove,
  nextRung,
  noteFeed,
  progressStory,
  statusWord,
  taskBucket,
  taskPhase,
  type NextMove,
  type NoteEntry,
  type TaskPhase,
} from "@/lib/item-experience";
import { horizonIsSuggested, suggestHorizon } from "@/lib/plan";
import { effectiveProgress, progressIsEstimated } from "@/lib/progress";
import type { AgendaEntry, LearningItem, LearningMilestone, LearningTask, RelatedChoices } from "@/types/learning";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "plan", label: "Plan" },
  { id: "agenda", label: "Agenda" },
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Notes & evidence" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const EMPTY_CHOICES: RelatedChoices = {
  attendance: [],
  plan: [],
  agendaPriority: [],
  taskStatus: [],
  taskType: [],
  taskPriority: [],
};

export function LearningDetail({
  item,
  items,
  readOnly,
  statuses,
  agenda = [],
  tasks = [],
  milestones = [],
  choices = EMPTY_CHOICES,
}: {
  item: LearningItem;
  items: LearningItem[];
  readOnly: boolean;
  statuses: string[];
  agenda?: AgendaEntry[];
  tasks?: LearningTask[];
  milestones?: LearningMilestone[];
  choices?: RelatedChoices;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [details, setDetails] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const gathering = isGathering(item.type);
  const move = nextMove(item, agenda, tasks);
  const story = progressStory(item, agenda, tasks);
  const target = nextRung(item.careerProgress);
  const needed = evidenceNeeded(item, milestones);
  const session = agenda.find((entry) => entry.id === sessionId) || null;
  const recorded = !progressIsEstimated(item) && typeof item.progress === "number" ? item.progress : undefined;
  const headline = story.overall ?? recorded;

  return (
    <div className="pb-16">
      <ItemHeader item={item} gathering={gathering} move={move} headline={headline} target={target} onDetails={() => setDetails(true)} />
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={tab === entry.id ? "border-b-2 border-accent px-3 py-2 text-sm font-semibold" : "px-3 py-2 text-sm text-muted"}
            onClick={() => setTab(entry.id)}
          >
            {entry.id === "agenda" && !gathering ? "Activities" : entry.label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <Overview item={item} gathering={gathering} move={move} story={story} headline={headline} target={target} needed={needed} agenda={agenda} onOpenAgenda={() => setTab("agenda")} />
      ) : null}
      {tab === "plan" ? <PlanTab item={item} tasks={tasks} milestones={milestones} needed={needed} /> : null}
      {tab === "agenda" ? (
        <AgendaTab agenda={agenda} choices={choices} readOnly={readOnly} onOpen={setSessionId} />
      ) : null}
      {tab === "tasks" ? <TasksTab item={item} tasks={tasks} choices={choices} readOnly={readOnly} /> : null}
      {tab === "notes" ? <NotesTab item={item} agenda={agenda} tasks={tasks} readOnly={readOnly} /> : null}

      <button
        type="button"
        className="fixed bottom-24 right-4 z-20 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink shadow md:bottom-6"
        onClick={() => setNoteOpen(true)}
      >
        + Note
      </button>

      {details ? (
        <Drawer title="Details" onClose={() => setDetails(false)}>
          <DetailsBody item={item} items={items} readOnly={readOnly} statuses={statuses} />
        </Drawer>
      ) : null}
      {session ? (
        <SessionDrawer item={item} entry={session} choices={choices} readOnly={readOnly} onClose={() => setSessionId(null)} />
      ) : null}
      {noteOpen ? <NoteComposer itemId={item.id} readOnly={readOnly} onClose={() => setNoteOpen(false)} /> : null}
    </div>
  );
}

function ItemHeader({
  item,
  gathering,
  move,
  headline,
  target,
  onDetails,
}: {
  item: LearningItem;
  gathering: boolean;
  move: NextMove | null;
  headline?: number;
  target: string | null;
  onDetails: () => void;
}) {
  const start = dayParts(item.startDate);
  const end = dayParts(item.endDate);
  const career = [item.skill || item.capability, item.careerProgress, target ? `→ ${target}` : ""].filter(Boolean).join(" ");
  return (
    <header>
      {gathering && start ? (
        <div className="sticky top-14 z-20 -mx-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mb-4 md:border-0 md:bg-transparent md:p-0">
          <div className="flex items-center gap-3">
            <DateBlock parts={start} />
            {end && item.endDate?.slice(0, 10) !== item.startDate?.slice(0, 10) ? (
              <>
                <span className="text-muted">→</span>
                <DateBlock parts={end} />
              </>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.name}</p>
              <p className="truncate text-xs text-muted">{[item.location, move?.kind === "session" ? move.title : ""].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
        </div>
      ) : null}
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        {[item.type, item.priority, item.status].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{item.name}</h1>
        <button type="button" className="shrink-0 text-sm text-accent" onClick={onDetails}>
          Details
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        {[formatDateRange(item.startDate, item.endDate), item.location, item.tracks.join(" · "), item.provider].filter((value) => value && value !== "—").join(" · ")}
      </p>
      {headline !== undefined ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Progress</span>
            <span>{headline}%</span>
          </div>
          <ProgressBar value={headline} />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">{statusWord(item.status)}</p>
      )}
      {career ? <p className="mt-3 text-sm">{career}</p> : null}
    </header>
  );
}

function DateBlock({ parts }: { parts: { day: string; month: string; weekday: string } }) {
  return (
    <div className="w-14 text-center">
      <p className="text-2xl font-semibold leading-none">{parts.day}</p>
      <p className="text-[11px] font-semibold tracking-wide">{parts.month}</p>
      <p className="text-[11px] text-muted">{parts.weekday}</p>
    </div>
  );
}

function Overview({
  item,
  gathering,
  move,
  story,
  headline,
  target,
  needed,
  agenda,
  onOpenAgenda,
}: {
  item: LearningItem;
  gathering: boolean;
  move: NextMove | null;
  story: ReturnType<typeof progressStory>;
  headline?: number;
  target: string | null;
  needed: string | null;
  agenda: AgendaEntry[];
  onOpenAgenda: () => void;
}) {
  return (
    <div className="mt-6 space-y-6">
      <NextCard move={move} />
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">About</h2>
        <p className="mt-2 text-sm leading-6">{item.why || item.offer || "No description yet."}</p>
      </section>
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Progress</h2>
        {headline === undefined && story.slices.length === 0 ? <p className="mt-2 text-sm text-muted">{statusWord(item.status)}</p> : null}
        <ul className="mt-3 space-y-2">
          {story.slices.map((slice) => (
            <li key={slice.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{slice.label}</span>
                <span className="text-muted">{slice.percent !== undefined ? `${slice.percent}%` : slice.state}</span>
              </div>
              {slice.percent !== undefined ? <ProgressBar value={slice.percent} /> : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-elev p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Career impact</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Fact label="Capability" value={item.capability || "Not set"} />
          <Fact label="Skill" value={item.skill || "Not set"} />
          <Fact label="Current" value={item.careerProgress || "Not set"} />
          <Fact label="Target" value={target || "At the top of the ladder"} />
        </dl>
        {needed ? <p className="mt-3 text-sm leading-6">{needed}</p> : <p className="mt-3 text-sm text-muted">Evidence still needs a milestone or a written outcome.</p>}
      </section>
      {gathering && agenda.length > 0 ? (
        <button type="button" className="text-sm font-semibold text-accent" onClick={onOpenAgenda}>
          {agenda.length} sessions on the agenda
        </button>
      ) : null}
      {!gathering && item.url ? (
        <a className="text-sm font-semibold text-accent" href={item.url} target="_blank" rel="noreferrer">
          Resource
        </a>
      ) : null}
    </div>
  );
}

function NextCard({ move }: { move: NextMove | null }) {
  if (!move) return <p className="text-sm text-muted">No open session, open task, or written next action.</p>;
  return (
    <section className="border-y border-line py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Next</p>
      <p className="mt-1 text-xl font-semibold leading-7">{move.title}</p>
      {move.when || move.detail ? <p className="mt-1 text-sm text-muted">{[move.when, move.detail].filter(Boolean).join(" · ")}</p> : null}
    </section>
  );
}

function PlanTab({
  item,
  tasks,
  milestones,
  needed,
}: {
  item: LearningItem;
  tasks: LearningTask[];
  milestones: LearningMilestone[];
  needed: string | null;
}) {
  const preparation = tasks.filter((task) => taskPhase(task, item) === "Before");
  return (
    <div className="mt-6 space-y-6">
      <Block title="Why it matters" body={item.why} empty="Why this item is on the plan is still empty." />
      <Block title="Learning outcome" body={item.outcome} empty="No outcome written yet." />
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Success</h2>
        {milestones.length === 0 && tasks.length === 0 ? <p className="mt-2 text-sm text-muted">No milestones or tasks describe success yet.</p> : null}
        <ul className="mt-2 space-y-2 text-sm">
          {milestones.map((milestone) => (
            <li key={milestone.id}>
              {milestone.name}
              {milestone.successCriteria ? <span className="text-muted"> — {milestone.successCriteria}</span> : null}
            </li>
          ))}
          {tasks.map((task) => (
            <li key={task.id}>
              {taskBucket(task) === "Done" ? "✓" : "□"} {task.name}
            </li>
          ))}
        </ul>
      </section>
      <Block title="Evidence target" body={needed || milestones.find((milestone) => milestone.evidence)?.evidence} empty="No evidence target on the linked milestones." />
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Preparation</h2>
        {preparation.length === 0 ? <p className="mt-2 text-sm text-muted">No preparation tasks dated before this item, and none typed as booking, preparation, or travel.</p> : null}
        <ul className="mt-2 space-y-1 text-sm">
          {preparation.map((task) => (
            <li key={task.id}>
              {taskBucket(task) === "Done" ? "✓" : "□"} {task.name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AgendaTab({
  agenda,
  choices,
  readOnly,
  onOpen,
}: {
  agenda: AgendaEntry[];
  choices: RelatedChoices;
  readOnly: boolean;
  onOpen: (id: string) => void;
}) {
  const days = useMemo(() => groupDays(agenda), [agenda]);
  if (agenda.length === 0) return <p className="mt-6 text-sm text-muted">No agenda sessions are linked to this item.</p>;
  return (
    <div className="mt-6 space-y-6">
      {days.map(([day, entries]) => (
        <section key={day}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{day === "unscheduled" ? "Time not set" : formatDisplayDate(day)}</h2>
          <ol className="mt-3 border-l border-line">
            {entries.map((entry) => (
              <li key={entry.id} className="relative pb-4 pl-4">
                <span className="absolute -left-1 top-1.5 h-2 w-2 rounded-full bg-accent" />
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => onOpen(entry.id)}>
                    <p className="text-xs text-muted">{clockLabel(entry)}</p>
                    <p className="font-medium">{entry.name}</p>
                    <p className="text-sm text-muted">{[entry.agendaType, entry.speaker, entry.venue].filter(Boolean).join(" · ")}</p>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {entry.priority ? <Badge tone={priorityTone(entry.priority)}>{entry.priority}</Badge> : null}
                    {entry.notes || entry.takeaways ? <span className="text-[11px] text-muted">Notes</span> : null}
                  </div>
                </div>
                <AttendanceSelect entry={entry} options={withCurrent(choices.attendance, entry.attendance)} readOnly={readOnly} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function TasksTab({ item, tasks, choices, readOnly }: { item: LearningItem; tasks: LearningTask[]; choices: RelatedChoices; readOnly: boolean }) {
  if (tasks.length === 0) return <p className="mt-6 text-sm text-muted">No tasks are linked to this item.</p>;
  const phases: TaskPhase[] = ["Before", "During", "After", "Open"];
  const buckets = ["To do", "In progress", "Done", "Skipped"] as const;
  return (
    <div className="mt-6 space-y-6">
      <p className="text-sm text-muted">{buckets.map((bucket) => `${tasks.filter((task) => taskBucket(task) === bucket).length} ${bucket.toLowerCase()}`).join(" · ")}</p>
      {phases.map((phase) => {
        const rows = tasks.filter((task) => taskPhase(task, item) === phase);
        if (rows.length === 0) return null;
        return (
          <section key={phase}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{phase}</h2>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {rows.map((task) => (
                <TaskRow key={task.id} task={task} choices={choices} readOnly={readOnly} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function TaskRow({ task, choices, readOnly }: { task: LearningTask; choices: RelatedChoices; readOnly: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{task.name}</p>
          <p className="text-sm text-muted">
            {[task.taskType, task.priority, task.when || task.due ? formatDisplayDate(task.when || task.due) : "", task.durationMinutes ? `${task.durationMinutes} min` : ""].filter(Boolean).join(" · ")}
          </p>
        </div>
        <select
          className="field w-32"
          disabled={readOnly}
          value={task.status || ""}
          onChange={async (event) => {
            setError(null);
            try {
              await saveTask(task.id, { status: event.target.value });
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not update the task.");
            }
          }}
        >
          {withCurrent(choices.taskStatus, task.status).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </li>
  );
}

function NotesTab({ item, agenda, tasks, readOnly }: { item: LearningItem; agenda: AgendaEntry[]; tasks: LearningTask[]; readOnly: boolean }) {
  const [filter, setFilter] = useState<NoteEntry["kind"] | "All">("All");
  const notes = noteFeed(item, agenda, tasks);
  const visible = filter === "All" ? notes : notes.filter((note) => note.kind === filter);
  const filters = ["All", "Notes", "Takeaways", "Ideas", "Questions", "Evidence"] as const;
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((entry) => (
          <button key={entry} type="button" className={filter === entry ? "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-ink" : "rounded-full border border-line px-3 py-1 text-xs"} onClick={() => setFilter(entry)}>
            {entry}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <p className="text-sm text-muted">Nothing captured in this filter yet.</p> : null}
      <ul className="divide-y divide-line border-y border-line">
        {visible.map((note) => (
          <li key={note.id} className="py-3">
            <p className="text-xs text-muted">{[note.kind, note.title, note.when ? formatDisplayDate(note.when) : ""].filter(Boolean).join(" · ")}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{note.body}</p>
          </li>
        ))}
      </ul>
      <EvidenceEditor item={item} readOnly={readOnly} />
    </div>
  );
}

function AttendanceSelect({ entry, options, readOnly }: { entry: AgendaEntry; options: string[]; readOnly: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  if (options.length === 0) return entry.attendance ? <p className="mt-1 text-xs text-muted">{entry.attendance}</p> : null;
  return (
    <label className="mt-2 block text-xs text-muted">
      Attendance
      <select
        className="field mt-1"
        disabled={readOnly}
        value={entry.attendance || ""}
        onChange={async (event) => {
          setError(null);
          try {
            await saveAgenda(entry.id, { attendance: event.target.value });
            router.refresh();
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not update attendance.");
          }
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <span className="mt-1 block text-danger">{error}</span> : null}
    </label>
  );
}

function SessionDrawer({
  item,
  entry,
  choices,
  readOnly,
  onClose,
}: {
  item: LearningItem;
  entry: AgendaEntry;
  choices: RelatedChoices;
  readOnly: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(entry.notes || "");
  const [takeaways, setTakeaways] = useState(entry.takeaways || "");
  const [followUp, setFollowUp] = useState(entry.followUp || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(patch: Record<string, string>) {
    setPending(true);
    setError(null);
    try {
      await saveAgenda(entry.id, patch);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the session.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Drawer title={entry.name} onClose={onClose}>
      <p className="text-sm text-muted">{formatSessionWhen(entry.start, entry.end)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {entry.priority ? <Badge tone={priorityTone(entry.priority)}>{entry.priority}</Badge> : null}
        {entry.plan ? <Badge>{entry.plan}</Badge> : null}
        {entry.attendance ? <Badge tone={statusTone(entry.attendance)}>{entry.attendance}</Badge> : null}
        {entry.agendaType ? <Badge>{entry.agendaType}</Badge> : null}
      </div>
      <p className="mt-3 text-sm">{[entry.speaker, entry.venue].filter(Boolean).join(" · ") || "No speaker or venue."}</p>
      {entry.url ? (
        <a className="mt-2 block text-sm text-accent underline" href={entry.url} target="_blank" rel="noreferrer">
          Session link
        </a>
      ) : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Choice label="Attendance" value={entry.attendance || ""} options={withCurrent(choices.attendance, entry.attendance)} disabled={readOnly || pending} onChange={(value) => void save({ attendance: value })} />
        <Choice label="Plan" value={entry.plan || ""} options={withCurrent(choices.plan, entry.plan)} disabled={readOnly || pending} onChange={(value) => void save({ plan: value })} />
      </div>
      <Field label="Notes" value={notes} disabled={readOnly || pending} onChange={setNotes} />
      <Field label="Takeaways" value={takeaways} disabled={readOnly || pending} onChange={setTakeaways} />
      <Field label="Follow-up" value={followUp} disabled={readOnly || pending} onChange={setFollowUp} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm disabled:opacity-50" disabled={readOnly || pending} onClick={() => void save({ notes, takeaways, followUp })}>
          Save notes
        </button>
        <button
          type="button"
          className="rounded-full border border-line px-3 py-1.5 text-sm disabled:opacity-50"
          disabled={readOnly || pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              const followType = choices.taskType.find((type) => type.toLowerCase() === "follow-up");
              await createTask({
                name: `Follow up: ${entry.name}`,
                learningItemId: item.id,
                ...(followType ? { taskType: followType } : {}),
                notes: followUp || undefined,
              });
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Could not create the follow-up.");
            } finally {
              setPending(false);
            }
          }}
        >
          Create follow-up
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </Drawer>
  );
}

function NoteComposer({ itemId, readOnly, onClose }: { itemId: string; readOnly: boolean; onClose: () => void }) {
  const router = useRouter();
  const labels = noteLabels();
  const [label, setLabel] = useState<string>(labels[0] || "");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <Drawer title="Add a note" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          try {
            await captureNote({ target: "item", id: itemId, label, text });
            router.refresh();
            onClose();
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not save the note.");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="block text-sm">
          Type
          <select className="field mt-1" value={label} disabled={readOnly} onChange={(event) => setLabel(event.target.value)}>
            {labels.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </label>
        <textarea className="field" disabled={readOnly} value={text} onChange={(event) => setText(event.target.value)} placeholder="What did you notice?" />
        <button type="submit" disabled={readOnly || pending} className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink disabled:opacity-50">
          {pending ? "Saving…" : "Save note"}
        </button>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
    </Drawer>
  );
}

function DetailsBody({ item, items, readOnly, statuses }: { item: LearningItem; items: LearningItem[]; readOnly: boolean; statuses: string[] }) {
  const related = relatedItems(items, item);
  const lines = (item.location || "").split(",").map((part) => part.trim()).filter(Boolean);
  return (
    <div className="space-y-5 text-sm">
      <Link href={`/learning/${item.id}/edit`} className="inline-block rounded-full border border-line px-3 py-1.5">
        Edit all fields
      </Link>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Fact label="Provider" value={item.provider || "—"} />
        <Fact label="Source" value={item.origin || "—"} />
        <Fact label="Track" value={item.tracks.join(", ") || "—"} />
        <Fact label="Deadline" value={formatDisplayDate(item.deadline)} />
        <Fact label="Planned hours" value={item.plannedHours === undefined ? "—" : String(item.plannedHours)} />
        <Fact label="Horizon" value={item.horizon || (horizonIsSuggested(item) ? `Suggested: ${suggestHorizon(item)}` : "—")} />
        <Fact label="Created" value={formatDisplayDate(item.createdAt)} />
        <Fact label="Updated" value={formatDisplayDate(item.updatedAt || item.updatedDate)} />
      </dl>
      <StatusEditor item={item} readOnly={readOnly} statuses={statuses} />
      <ProgressEditor item={item} readOnly={readOnly} />
      <DateEditor item={item} readOnly={readOnly} />
      {item.location ? (
        <p>
          {lines.join(", ")}{" "}
          <a className="text-accent" href={mapsSearchUrl(item.location)} target="_blank" rel="noreferrer">
            Map
          </a>{" "}
          <a className="text-accent" href={mapsDirectionsUrl(item.location)} target="_blank" rel="noreferrer">
            Directions
          </a>
        </p>
      ) : null}
      {item.url ? (
        <a className="block text-accent underline" href={item.url} target="_blank" rel="noreferrer">
          Primary link
        </a>
      ) : null}
      {item.emailUrl ? (
        <a className="block break-all text-accent underline" href={item.emailUrl}>
          Confirmation
        </a>
      ) : null}
      {item.notionUrl ? (
        <a className="block text-accent underline" href={item.notionUrl} target="_blank" rel="noreferrer">
          Open in Notion
        </a>
      ) : null}
      {item.offer ? <p className="leading-6">{item.offer}</p> : null}
      <section>
        <h3 className="font-medium">Related</h3>
        {related.length === 0 ? <p className="mt-1 text-muted">No related items on the same tracks.</p> : null}
        <ul className="mt-1 space-y-1">
          {related.map((entry) => (
            <li key={entry.id}>
              <Link href={`/learning/${entry.id}`} className="hover:text-accent">
                {entry.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <DeleteControl item={item} readOnly={readOnly} />
    </div>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <button type="button" aria-label="Close" className="h-full flex-1" onClick={onClose} />
      <aside className="h-full w-full max-w-md overflow-y-auto bg-canvas p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="text-sm text-muted" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </aside>
    </div>
  );
}

function Block({ title, body, empty }: { title: string; body?: string | null; empty: string }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</h2>
      <p className="mt-2 text-sm leading-6">{body?.trim() || empty}</p>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function Choice({ label, value, options, disabled, onChange }: { label: string; value: string; options: string[]; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      {label}
      <select className="field mt-1" disabled={disabled || options.length === 0} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block text-sm">
      {label}
      <textarea className="field mt-1" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function groupDays(agenda: AgendaEntry[]): [string, AgendaEntry[]][] {
  const days = new Map<string, AgendaEntry[]>();
  const sorted = [...agenda].sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999"));
  for (const entry of sorted) {
    const key = entry.start?.slice(0, 10) || "unscheduled";
    const list = days.get(key) || [];
    list.push(entry);
    days.set(key, list);
  }
  return [...days.entries()];
}

function clockLabel(entry: AgendaEntry): string {
  const start = formatClock(entry.start);
  const end = formatClock(entry.end);
  if (start && end) return `${start}–${end}`;
  return start || "Time not set";
}

function withCurrent(options: string[], current?: string): string[] {
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}

function DateEditor({ item, readOnly }: { item: LearningItem; readOnly: boolean }) {
  const router = useRouter();
  const [completedDate, setCompletedDate] = useState(item.completedDate || "");
  const [updatedDate, setUpdatedDate] = useState(item.updatedDate || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        try {
          await saveItem(item.id, { completedDate, updatedDate });
          router.refresh();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not update dates.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="text-sm">
        Completed date
        <input className="field mt-1" type="date" disabled={readOnly} value={completedDate} onChange={(event) => setCompletedDate(event.target.value)} />
      </label>
      <label className="text-sm">
        Updated date
        <input className="field mt-1" type="date" disabled={readOnly} value={updatedDate} onChange={(event) => setUpdatedDate(event.target.value)} />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={readOnly || pending} className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink disabled:opacity-50">
          {pending ? "Saving…" : "Save dates"}
        </button>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>
    </form>
  );
}

function StatusEditor({ item, readOnly, statuses }: { item: LearningItem; readOnly: boolean; statuses: string[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <label className="block text-sm">
      Status
      <select
        className="field mt-1"
        disabled={readOnly}
        value={item.status}
        onChange={async (event) => {
          setError(null);
          try {
            await saveItem(item.id, { status: event.target.value });
            router.refresh();
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not update status.");
          }
        }}
      >
        {(statuses.includes(item.status) ? statuses : [item.status, ...statuses]).map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>
      {error ? <span className="mt-1 block text-danger">{error}</span> : null}
    </label>
  );
}

function ProgressEditor({ item, readOnly }: { item: LearningItem; readOnly: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(item.progress ?? effectiveProgress(item));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        try {
          await saveItem(item.id, { progress: Number(value) });
          router.refresh();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not update progress.");
        }
      }}
    >
      <label className="text-sm">
        Recorded progress
        <input className="field mt-1 w-28" type="number" min={0} max={100} disabled={readOnly} value={value} onChange={(event) => setValue(Number(event.target.value))} />
      </label>
      <button type="submit" disabled={readOnly} className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink disabled:opacity-50">
        Save progress
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}

function EvidenceEditor({ item, readOnly }: { item: LearningItem; readOnly: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const evidence = item.evidence || [];

  async function update(next: string[]) {
    setError(null);
    try {
      await saveItem(item.id, { evidence: next });
      setDraft("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update evidence.");
    }
  }

  return (
    <section className="rounded-2xl border border-line p-4">
      <h2 className="text-sm font-semibold">Create evidence</h2>
      <p className="mt-1 text-sm text-muted">A finished course or a conference ticket does not move a skill to Applied. Record something you used.</p>
      {evidence.length === 0 ? <p className="mt-2 text-sm text-muted">No evidence yet.</p> : null}
      <ul className="mt-2 space-y-2 text-sm">
        {evidence.map((entry) => (
          <li key={entry} className="flex items-start justify-between gap-3">
            <span>{entry}</span>
            <button type="button" className="text-muted underline" disabled={readOnly} onClick={() => update(evidence.filter((itemName) => itemName !== entry))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          update([...evidence, draft.trim()]);
        }}
      >
        <input className="field max-w-md" disabled={readOnly} value={draft} placeholder="Demo, prototype, decision, analysis…" onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" disabled={readOnly} className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink disabled:opacity-50">
          Add evidence
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </section>
  );
}

function DeleteControl({ item, readOnly }: { item: LearningItem; readOnly: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <section>
      <h3 className="font-medium">Archive</h3>
      <p className="mt-1 text-muted">Archiving hides the item. In Notion the page is moved to trash.</p>
      <button type="button" disabled={readOnly} className="mt-2 rounded-full border border-danger px-3 py-1.5 text-sm text-danger disabled:opacity-50" onClick={() => setOpen(true)}>
        Archive item
      </button>
      {open ? (
        <div className="mt-3">
          <p>Archive “{item.name}”?</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-full bg-[#8d342c] px-3 py-1.5 text-sm text-white"
              onClick={async () => {
                try {
                  await removeItem(item.id);
                  router.push("/learning");
                  router.refresh();
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Could not archive.");
                }
              }}
            >
              Confirm archive
            </button>
            <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {error ? <p className="mt-2 text-danger">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
