"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ITEM_ORIGINS, ITEM_PRIORITIES, ITEM_STATUSES, ITEM_TYPES, TRACKS } from "@/lib/constants";
import { saveItem } from "@/lib/client-api";
import type { LearningItem, LearningItemInput } from "@/types/learning";

const EMPTY: LearningItemInput = {
  name: "",
  type: "Course",
  status: "To Do",
  priority: "Medium",
  tracks: [],
  evidence: [],
};

export function ItemForm({
  item,
  readOnly,
}: {
  item?: LearningItem;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const initial: LearningItemInput = item
    ? {
        name: item.name,
        type: item.type,
        status: item.status,
        priority: item.priority,
        tracks: item.tracks,
        origin: item.origin,
        provider: item.provider,
        startDate: item.startDate,
        endDate: item.endDate,
        deadline: item.deadline,
        completedDate: item.completedDate,
        updatedDate: item.updatedDate,
        location: item.location,
        url: item.url,
        emailUrl: item.emailUrl,
        notes: item.notes,
        nextAction: item.nextAction,
        offer: item.offer,
        progress: item.progress,
        evidence: item.evidence,
        cost: item.cost,
        currency: item.currency,
      }
    : EMPTY;
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof LearningItemInput>(key: K, value: LearningItemInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const saved = await saveItem(item?.id || null, {
        ...form,
        evidence: typeof form.evidence === "string" ? form.evidence : form.evidence,
      });
      router.push(`/learning/${saved.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {readOnly ? <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">Edits are paused until Notion responds.</p> : null}
      <label className="text-sm">
        Name
        <input className="field mt-1" required value={form.name} onChange={(event) => set("name", event.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FieldSelect label="Source" value={form.origin || ""} options={ITEM_ORIGINS} allowEmpty onChange={(value) => set("origin", (value || undefined) as LearningItemInput["origin"])} />
        <FieldSelect label="Type" value={form.type} options={ITEM_TYPES} onChange={(value) => set("type", value as LearningItemInput["type"])} />
        <FieldSelect label="Status" value={form.status} options={ITEM_STATUSES} onChange={(value) => set("status", value as LearningItemInput["status"])} />
        <FieldSelect label="Priority" value={form.priority} options={ITEM_PRIORITIES} onChange={(value) => set("priority", value as LearningItemInput["priority"])} />
      </div>
      <fieldset>
        <legend className="text-sm">Tracks</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TRACKS.map((track) => {
            const checked = form.tracks.includes(track.id);
            return (
              <label key={track.id} className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    set(
                      "tracks",
                      checked ? form.tracks.filter((entry) => entry !== track.id) : [...form.tracks, track.id],
                    )
                  }
                />
                {track.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Text label="Provider" value={form.provider || ""} onChange={(value) => set("provider", value)} />
        <Text label="Location" value={form.location || ""} onChange={(value) => set("location", value)} />
        <Text label="Start date" type="date" value={form.startDate || ""} onChange={(value) => set("startDate", value)} />
        <Text label="End date" type="date" value={form.endDate || ""} onChange={(value) => set("endDate", value)} />
        <Text label="Deadline" type="date" value={form.deadline || ""} onChange={(value) => set("deadline", value)} />
        <Text label="Completed date" type="date" value={form.completedDate || ""} onChange={(value) => set("completedDate", value)} />
        <Text label="Updated date" type="date" value={form.updatedDate || ""} onChange={(value) => set("updatedDate", value)} />
        <Text label="Progress" type="number" value={form.progress === undefined ? "" : String(form.progress)} onChange={(value) => set("progress", value === "" ? undefined : Number(value))} />
        <Text label="Link" value={form.url || ""} onChange={(value) => set("url", value)} />
        <Text label="Email or confirmation link" value={form.emailUrl || ""} onChange={(value) => set("emailUrl", value)} />
        <Text label="Cost" type="number" value={form.cost === undefined ? "" : String(form.cost)} onChange={(value) => set("cost", value === "" ? undefined : Number(value))} />
        <Text label="Currency" value={form.currency || ""} onChange={(value) => set("currency", value)} />
      </div>
      <Area label="Offer" value={form.offer || ""} onChange={(value) => set("offer", value)} />
      <Area label="Notes" value={form.notes || ""} onChange={(value) => set("notes", value)} />
      <Area label="Next action" value={form.nextAction || ""} onChange={(value) => set("nextAction", value)} />
      <Area
        label="Evidence, one per line"
        value={(form.evidence || []).join("\n")}
        onChange={(value) => set("evidence", value.split("\n").map((line) => line.trim()).filter(Boolean))}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex gap-3">
        <button type="submit" disabled={pending || readOnly} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50">
          {pending ? "Saving…" : item ? "Save changes" : "Create"}
        </button>
        <button type="button" className="rounded-full border border-line px-5 py-2 text-sm" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Text({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="text-sm">
      {label}
      <input className="field mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      {label}
      <textarea className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
  allowEmpty = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <label className="text-sm">
      {label}
      <select className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)}>
        {allowEmpty ? <option value="">Not set</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
