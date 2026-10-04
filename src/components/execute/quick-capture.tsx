"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, captureNote, createTask } from "@/lib/client-api";
import { dateStamp, noteLabels } from "@/lib/execute";

type ItemOption = { id: string; name: string };

export function QuickCapture() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"task" | "note" | "menu">("menu");
  const [items, setItems] = useState<ItemOption[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function show(next: "task" | "note" | "menu") {
    setError("");
    setMode(next);
    setOpen(true);
    if (items.length > 0) return;
    const response = await fetch("/api/items");
    const data = (await response.json().catch(() => ({}))) as { items?: ItemOption[] };
    setItems((data.items || []).map((item) => ({ id: item.id, name: item.name })));
  }

  return (
    <>
      <button
        type="button"
        className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-2xl text-accent-ink shadow-lg md:bottom-6"
        aria-label="Add"
        onClick={() => (open ? setOpen(false) : void show("menu"))}
      >
        +
      </button>
      {open ? (
        <div className="fixed inset-x-3 bottom-36 z-30 rounded-2xl border border-line bg-elev p-4 shadow-xl md:inset-x-auto md:bottom-20 md:right-4 md:w-96">
          {mode === "menu" ? (
            <div className="grid gap-2">
              <p className="text-sm font-semibold">Add</p>
              <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-canvas" onClick={() => setMode("task")}>
                Add task
              </button>
              <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-canvas" onClick={() => setMode("note")}>
                Add note
              </button>
              <Link href="/learning/new" className="rounded-xl px-3 py-2 text-sm hover:bg-canvas">
                Schedule learning
              </Link>
              <Link href="/learning/new" className="rounded-xl px-3 py-2 text-sm hover:bg-canvas">
                Add learning item
              </Link>
            </div>
          ) : null}
          {mode === "task" ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const name = String(data.get("name") || "").trim();
                const date = String(data.get("date") || "");
                const time = String(data.get("time") || "");
                const duration = Number(data.get("duration") || "");
                if (!name) return;
                setBusy(true);
                setError("");
                void createTask({
                  name,
                  due: date ? dateStamp(date, time || undefined) : undefined,
                  durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : undefined,
                  learningItemId: String(data.get("item") || "") || undefined,
                })
                  .then(() => {
                    setOpen(false);
                    setMode("menu");
                    router.refresh();
                  })
                  .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not add the task."))
                  .finally(() => setBusy(false));
              }}
            >
              <p className="text-sm font-semibold">New task</p>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Task</span>
                <input className="field" name="name" required autoFocus />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  <span className="mb-1 block text-muted">When</span>
                  <input className="field" type="date" name="date" />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Time</span>
                  <input className="field" type="time" name="time" />
                </label>
              </div>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Duration, minutes, optional</span>
                <input className="field" name="duration" type="number" min={1} max={480} inputMode="numeric" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Learning item, optional</span>
                <select className="field" name="item" defaultValue="">
                  <option value="">None</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
                  Add task
                </button>
                <button type="button" className="text-sm text-muted" onClick={() => setMode("menu")}>
                  Back
                </button>
              </div>
            </form>
          ) : null}
          {mode === "note" ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setBusy(true);
                setError("");
                void captureNote({
                  target: "item",
                  id: String(data.get("item") || ""),
                  label: String(data.get("label") || ""),
                  text: String(data.get("text") || ""),
                })
                  .then(() => {
                    setOpen(false);
                    setMode("menu");
                    router.refresh();
                  })
                  .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not save the note."))
                  .finally(() => setBusy(false));
              }}
            >
              <p className="text-sm font-semibold">New note</p>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Learning item</span>
                <select className="field" name="item" required defaultValue="">
                  <option value="" disabled>
                    Choose
                  </option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <select className="field" name="label" defaultValue="Key takeaway">
                {noteLabels().map((label) => (
                  <option key={label}>{label}</option>
                ))}
              </select>
              <textarea className="field" name="text" required placeholder="Write the note" />
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
                  Save note
                </button>
                <button type="button" className="text-sm text-muted" onClick={() => setMode("menu")}>
                  Back
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
