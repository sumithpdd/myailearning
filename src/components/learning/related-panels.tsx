"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, priorityTone, statusTone } from "@/components/ui";
import { saveAgenda, saveTask } from "@/lib/client-api";
import { formatDisplayDate, formatSessionWhen } from "@/lib/dates";
import type { AgendaEntry, LearningTask, RelatedChoices } from "@/types/learning";

export function RelatedPanels({
  agenda,
  tasks,
  choices,
  readOnly,
}: {
  agenda: AgendaEntry[];
  tasks: LearningTask[];
  choices: RelatedChoices;
  readOnly: boolean;
}) {
  if (agenda.length === 0 && tasks.length === 0) return null;
  return (
    <>
      {agenda.length > 0 ? <AgendaPanel agenda={agenda} choices={choices} readOnly={readOnly} /> : null}
      {tasks.length > 0 ? <TaskPanel tasks={tasks} choices={choices} readOnly={readOnly} /> : null}
    </>
  );
}

function AgendaPanel({ agenda, choices, readOnly }: { agenda: AgendaEntry[]; choices: RelatedChoices; readOnly: boolean }) {
  const days = new Map<string, AgendaEntry[]>();
  for (const entry of agenda) {
    const key = entry.start?.slice(0, 10) || "unscheduled";
    const list = days.get(key) || [];
    list.push(entry);
    days.set(key, list);
  }
  return (
    <section className="rounded-2xl border border-line bg-elev p-4">
      <h2 className="font-serif text-2xl">Agenda</h2>
      <p className="mt-1 text-sm text-muted">{agenda.length} sessions from the Learning Agenda.</p>
      <div className="mt-4 space-y-5">
        {[...days.entries()].map(([day, entries]) => (
          <div key={day}>
            <h3 className="text-sm font-semibold">{day === "unscheduled" ? "Time not set" : formatDisplayDate(day)}</h3>
            <div className="mt-2 space-y-3">
              {entries.map((entry) => (
                <AgendaCard key={entry.id} entry={entry} choices={choices} readOnly={readOnly} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AgendaCard({ entry, choices, readOnly }: { entry: AgendaEntry; choices: RelatedChoices; readOnly: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(entry.notes || "");
  const [takeaways, setTakeaways] = useState(entry.takeaways || "");
  const [followUp, setFollowUp] = useState(entry.followUp || "");
  const [pending, setPending] = useState(false);
  const attendance = withCurrent(choices.attendance, entry.attendance);
  const plans = withCurrent(choices.plan, entry.plan);

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
    <article className="rounded-xl border border-line bg-canvas p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-medium">{entry.name}</h4>
        <p className="text-xs text-muted">{formatSessionWhen(entry.start, entry.end)}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {entry.priority ? <Badge tone={priorityTone(entry.priority)}>{entry.priority}</Badge> : null}
        {entry.plan ? <Badge>{entry.plan}</Badge> : null}
        {entry.attendance ? <Badge tone={statusTone(entry.attendance)}>{entry.attendance}</Badge> : null}
        {entry.agendaType ? <Badge>{entry.agendaType}</Badge> : null}
        {entry.tracks.map((track) => (
          <Badge key={track}>{track}</Badge>
        ))}
      </div>
      {entry.venue || entry.speaker ? (
        <p className="mt-2 text-sm text-muted">{[entry.venue, entry.speaker].filter(Boolean).join(" · ")}</p>
      ) : null}
      {entry.url ? (
        <a className="mt-2 block text-sm text-accent underline" href={entry.url} target="_blank" rel="noreferrer">
          Session link
        </a>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Choice
          label="Attendance"
          value={entry.attendance || ""}
          options={attendance}
          disabled={readOnly || pending}
          onChange={(value) => void save({ attendance: value })}
        />
        <Choice
          label="Plan"
          value={entry.plan || ""}
          options={plans}
          disabled={readOnly || pending}
          onChange={(value) => void save({ plan: value })}
        />
      </div>
      <div className="mt-3 grid gap-2">
        <Field label="Notes" value={notes} disabled={readOnly || pending} onChange={setNotes} />
        <Field label="Takeaways" value={takeaways} disabled={readOnly || pending} onChange={setTakeaways} />
        <Field label="Follow-up" value={followUp} disabled={readOnly || pending} onChange={setFollowUp} />
        <button
          type="button"
          className="w-fit rounded-full border border-line px-3 py-1 text-sm disabled:opacity-50"
          disabled={readOnly || pending}
          onClick={() => void save({ notes, takeaways, followUp })}
        >
          {pending ? "Saving…" : "Save notes"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </article>
  );
}

function TaskPanel({ tasks, choices, readOnly }: { tasks: LearningTask[]; choices: RelatedChoices; readOnly: boolean }) {
  const open = tasks.filter((task) => !["done", "skipped", "completed"].includes((task.status || "").toLowerCase()));
  return (
    <section className="rounded-2xl border border-line bg-elev p-4">
      <h2 className="font-serif text-2xl">Tasks</h2>
      <p className="mt-1 text-sm text-muted">
        {open.length} open of {tasks.length} from Learning Tasks.
      </p>
      <ul className="mt-4 space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} statuses={withCurrent(choices.taskStatus, task.status)} readOnly={readOnly} />
        ))}
      </ul>
    </section>
  );
}

function TaskCard({ task, statuses, readOnly }: { task: LearningTask; statuses: string[]; readOnly: boolean }) {
  const router = useRouter();
  const [notes, setNotes] = useState(task.notes || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(patch: Record<string, string>) {
    setPending(true);
    setError(null);
    try {
      await saveTask(task.id, patch);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the task.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="rounded-xl border border-line bg-canvas p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">{task.name}</h3>
        <p className="text-xs text-muted">{task.due ? `Due ${formatDisplayDate(task.due)}` : "No due date"}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {task.status ? <Badge tone={statusTone(task.status)}>{task.status}</Badge> : null}
        {task.priority ? <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge> : null}
        {task.taskType ? <Badge>{task.taskType}</Badge> : null}
      </div>
      {task.url ? (
        <a className="mt-2 block text-sm text-accent underline" href={task.url} target="_blank" rel="noreferrer">
          Task link
        </a>
      ) : null}
      <div className="mt-3">
        <Choice
          label="Status"
          value={task.status || ""}
          options={statuses}
          disabled={readOnly || pending}
          onChange={(value) => void save({ status: value })}
        />
      </div>
      <div className="mt-3 grid gap-2">
        <Field label="Notes" value={notes} disabled={readOnly || pending} onChange={setNotes} />
        <button
          type="button"
          className="w-fit rounded-full border border-line px-3 py-1 text-sm disabled:opacity-50"
          disabled={readOnly || pending || notes === (task.notes || "")}
          onClick={() => void save({ notes })}
        >
          {pending ? "Saving…" : "Save notes"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </li>
  );
}

function Choice({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      {label}
      <select className="field mt-1" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">Not set</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm">
      {label}
      <textarea className="field mt-1" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function withCurrent(options: string[], current?: string): string[] {
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}
