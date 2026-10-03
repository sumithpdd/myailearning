"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, saveAgenda, saveTask } from "@/lib/client-api";
import { formatClock, formatDisplayDate } from "@/lib/dates";
import { dateStamp, formatMinutes, noteLabels, type DayBlock } from "@/lib/execute";
import { cn } from "@/lib/cn";

export function WorkList({ blocks, empty }: { blocks: DayBlock[]; empty?: string }) {
  if (blocks.length === 0) return <p className="py-3 text-sm text-muted">{empty || "Nothing here."}</p>;
  return (
    <ol className="divide-y divide-line border-y border-line">
      {blocks.map((block) => (
        <li key={`${block.kind}-${block.id}`}>
          <WorkRow block={block} />
        </li>
      ))}
    </ol>
  );
}

function WorkRow({ block }: { block: DayBlock }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [whenOpen, setWhenOpen] = useState(false);
  const time = block.hasTime ? formatClock(block.start) : "";
  const end = block.hasTime ? formatClock(block.end) : "";
  const duration = formatMinutes(block.durationMinutes);
  const href = block.parentId ? `/learning/${block.parentId}` : block.kind === "task" ? "/tasks" : "/learning";

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update this.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={cn("grid gap-3 py-3 sm:grid-cols-[7.5rem_1fr] sm:gap-4", block.completed && "opacity-60")}>
      <div className="text-sm">
        <p className="font-medium tabular-nums">{time && end ? `${time}–${end}` : time || (block.date ? formatDisplayDate(block.date) : "Unscheduled")}</p>
        {duration ? <p className="text-muted">{duration}</p> : <p className="text-muted">{block.kind === "task" ? "No duration" : "Time not set"}</p>}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {block.parentName ? (
            <Link href={href} className="text-sm text-muted hover:text-accent">
              {block.parentName}
            </Link>
          ) : null}
          {block.overdue ? <span className="text-xs font-semibold uppercase tracking-wide text-danger">Overdue</span> : null}
        </div>
        <h3 className={cn("text-base font-semibold leading-6", block.completed && "line-through")}>{block.title}</h3>
        <p className="mt-1 text-sm text-muted">
          {[block.taskType, block.priority, block.status, block.notes ? "Has notes" : ""].filter(Boolean).join(" · ") || "No extra detail"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {block.url ? (
            <a href={block.url} className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">
              Start
            </a>
          ) : (
            <Link href={href} className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">
              Start
            </Link>
          )}
          {block.completed ? null : (
            <button
              type="button"
              disabled={busy}
              className="rounded-full border border-line px-3 py-1.5 text-sm"
              onClick={() =>
                run(() =>
                  block.kind === "session" ? saveAgenda(block.id, { attendance: "Attended" }) : saveTask(block.id, { status: "Done" }),
                )
              }
            >
              Complete
            </button>
          )}
          {block.kind === "task" ? (
            <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm" onClick={() => setWhenOpen((open) => !open)}>
              Reschedule
            </button>
          ) : null}
          <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm" onClick={() => setNoteOpen((open) => !open)}>
            Add note
          </button>
        </div>
        {whenOpen && block.kind === "task" ? (
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const date = String(data.get("date") || "");
              const timeValue = String(data.get("time") || "");
              if (!date) return;
              void run(() => saveTask(block.id, { due: dateStamp(date, timeValue || undefined) }));
            }}
          >
            <label className="text-sm">
              <span className="mb-1 block text-muted">When</span>
              <input className="field" type="date" name="date" required defaultValue={block.date || ""} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Time</span>
              <input className="field" type="time" name="time" />
            </label>
            <button type="submit" disabled={busy} className="rounded-full bg-ink px-3 py-2 text-sm text-canvas">
              Save
            </button>
          </form>
        ) : null}
        {noteOpen ? <NoteForm block={block} busy={busy} onSave={(payload) => run(() => saveNote(block, payload))} /> : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>
    </article>
  );
}

function NoteForm({
  block,
  busy,
  onSave,
}: {
  block: DayBlock;
  busy: boolean;
  onSave: (payload: { label: string; text: string }) => void;
}) {
  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const label = String(data.get("label") || "");
        const text = String(data.get("text") || "").trim();
        if (!text) return;
        onSave({ label, text });
        event.currentTarget.reset();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
        <select className="field" name="label" defaultValue="Key takeaway">
          {noteLabels().map((label) => (
            <option key={label}>{label}</option>
          ))}
        </select>
        <textarea className="field" name="text" rows={3} placeholder="What did you learn?" required />
      </div>
      <button type="submit" disabled={busy} className="justify-self-start rounded-full bg-ink px-3 py-2 text-sm text-canvas">
        Save note
      </button>
    </form>
  );
}

async function saveNote(block: DayBlock, payload: { label: string; text: string }) {
  const next = [block.notes, `${payload.label}: ${payload.text}`].filter(Boolean).join("\n\n");
  if (block.kind === "session") {
    await saveAgenda(block.id, { notes: next });
    return;
  }
  await saveTask(block.id, { notes: next });
}

