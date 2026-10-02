"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ChoiceProperty = {
  name: string;
  type: "select" | "multi_select" | "status";
  options: { id?: string; name: string; color?: string }[];
};

export function SchemaEditor({ properties, readOnly }: { properties: ChoiceProperty[]; readOnly: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function send(key: string, body: { property: string; op: "add" | "rename" | "remove"; name?: string; id?: string }) {
    setPending(key);
    setError(null);
    try {
      const response = await fetch("/api/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Could not update Notion.");
      setDrafts((current) => ({ ...current, [body.property]: "" }));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update Notion.");
    } finally {
      setPending(null);
    }
  }

  if (properties.length === 0) {
    return <p className="text-sm text-muted">Connect Notion to edit status, tags, and the other choice lists.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted">
        These lists are the options stored in Notion. Adding, renaming, or removing one updates the database. An option that is still used on a page cannot be removed until those pages change.
      </p>
      <p className="text-sm leading-6 text-muted">
        Focus and pace still recognise In Progress, Going, Completed, Attended, Skipped, Core, and High. Renaming those words changes how the plan is scored.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {properties.map((property) => (
        <section key={property.name} className="rounded-2xl border border-line bg-elev p-4">
          <h3 className="font-medium">
            {property.name} <span className="text-xs font-normal text-muted">{property.type.replace("_", " ")}</span>
          </h3>
          <ul className="mt-3 space-y-2">
            {property.options.map((option) => (
              <OptionRow
                key={option.id || option.name}
                option={option}
                disabled={readOnly || pending !== null || !option.id}
                pending={pending === `${property.name}:${option.id}`}
                onRename={(name) => send(`${property.name}:${option.id}`, { property: property.name, op: "rename", id: option.id, name })}
                onRemove={() => send(`${property.name}:${option.id}:remove`, { property: property.name, op: "remove", id: option.id })}
              />
            ))}
          </ul>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = (drafts[property.name] || "").trim();
              if (!name) return;
              void send(`${property.name}:add`, { property: property.name, op: "add", name });
            }}
          >
            <input
              className="field min-w-48 flex-1"
              placeholder={`Add a ${property.name} option`}
              value={drafts[property.name] || ""}
              disabled={readOnly || pending !== null}
              onChange={(event) => setDrafts((current) => ({ ...current, [property.name]: event.target.value }))}
            />
            <button
              type="submit"
              disabled={readOnly || pending !== null}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
            >
              {pending === `${property.name}:add` ? "Adding…" : "Add"}
            </button>
          </form>
        </section>
      ))}
    </div>
  );
}

function OptionRow({
  option,
  disabled,
  pending,
  onRename,
  onRemove,
}: {
  option: { id?: string; name: string };
  disabled: boolean;
  pending: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(option.name);
  return (
    <li className="flex flex-wrap items-center gap-2">
      <input className="field min-w-40 flex-1" value={name} disabled={disabled} onChange={(event) => setName(event.target.value)} />
      <button
        type="button"
        className="rounded-full border border-line px-3 py-1 text-sm disabled:opacity-50"
        disabled={disabled || name.trim() === option.name || !name.trim()}
        onClick={() => onRename(name.trim())}
      >
        {pending ? "Saving…" : "Rename"}
      </button>
      <button
        type="button"
        className="rounded-full border border-line px-3 py-1 text-sm text-danger disabled:opacity-50"
        disabled={disabled}
        onClick={onRemove}
      >
        Remove
      </button>
    </li>
  );
}
