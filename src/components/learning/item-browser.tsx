"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LearningCard, LearningTable } from "@/components/learning/cards";
import { EmptyState, ModeBanner } from "@/components/ui";
import { SHELVES, filterItems, matchesShelf, parseFilters, providersOf, sortItems, type SortKey } from "@/lib/filters";
import type { Catalog } from "@/lib/notion/schema";
import type { LearningItem } from "@/types/learning";

export function ItemBrowser({
  items,
  mode,
  warning,
  readOnly,
  basePath,
  catalog,
  preset,
  defaultSort = "priority",
  titleNote,
}: {
  items: LearningItem[];
  mode: "demo" | "notion";
  warning?: string;
  readOnly: boolean;
  basePath: string;
  catalog: Catalog;
  preset?: { type?: string[] };
  defaultSort?: SortKey;
  titleNote?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const record = Object.fromEntries(searchParams.entries());
  const filters = parseFilters(record);
  const sort = filters.sort || defaultSort;
  const view = searchParams.get("view") === "table" ? "table" : "cards";
  const query = filters.q || "";

  const effective = {
    ...filters,
    q: query,
    sort,
    type: filters.type && filters.type.length > 0 ? filters.type : preset?.type,
  };
  const visible = sortItems(filterItems(items, effective), sort);
  const providers = providersOf(items);

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  return (
    <div>
      <ModeBanner mode={mode} warning={warning} />
      {titleNote ? <p className="mb-4 text-sm text-muted">{titleNote}</p> : null}
      <div className="mb-4 grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Toggle label="All" on={!filters.shelf} onClick={() => update({ shelf: null })} />
          {SHELVES.map((shelf) => (
            <Toggle
              key={shelf.id}
              label={`${shelf.label} ${items.filter((item) => matchesShelf(item, shelf.id)).length}`}
              on={filters.shelf === shelf.id}
              onClick={() => update({ shelf: filters.shelf === shelf.id ? null : shelf.id })}
            />
          ))}
        </div>
        <label className="block">
          <span className="sr-only">Search</span>
          <input
            className="field"
            placeholder="Search title, notes, source, track, location, next action"
            value={query}
            onChange={(event) => update({ q: event.target.value || null })}
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Status" value={filters.status?.[0] || ""} onChange={(value) => update({ status: value || null })} options={catalog.status} />
          <Select label="Priority" value={filters.priority?.[0] || ""} onChange={(value) => update({ priority: value || null })} options={catalog.priority} />
          <Select label="Source" value={filters.origin || ""} onChange={(value) => update({ source: value || null })} options={catalog.origin} />
          <Select label="Type" value={filters.type?.[0] || ""} onChange={(value) => update({ type: value || null })} options={catalog.type} />
          <Select label="Track" value={filters.track?.[0] || ""} onChange={(value) => update({ track: value || null })} options={catalog.track} />
          <Select label="Provider" value={filters.provider || ""} onChange={(value) => update({ provider: value || null })} options={providers} />
          <Select
            label="Sort"
            value={sort}
            onChange={(value) => update({ sort: value || null })}
            options={["date", "deadline", "priority", "progress", "name", "updated"]}
          />
          <label className="text-xs text-muted">
            From
            <input className="field mt-1" type="date" value={filters.from || ""} onChange={(event) => update({ from: event.target.value || null })} />
          </label>
          <label className="text-xs text-muted">
            To
            <input className="field mt-1" type="date" value={filters.to || ""} onChange={(event) => update({ to: event.target.value || null })} />
          </label>
          <label className="text-xs text-muted">
            Deadline before
            <input className="field mt-1" type="date" value={filters.deadlineBefore || ""} onChange={(event) => update({ deadline: event.target.value || null })} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Toggle label="Upcoming" on={Boolean(filters.upcoming)} onClick={() => update({ upcoming: filters.upcoming ? null : "1" })} />
          <Toggle label="Completed" on={Boolean(filters.completed)} onClick={() => update({ completed: filters.completed ? null : "1" })} />
          <Toggle label="Expiring soon" on={Boolean(filters.expiring)} onClick={() => update({ expiring: filters.expiring ? null : "1" })} />
          <Toggle label="Overdue" on={Boolean(filters.overdue)} onClick={() => update({ overdue: filters.overdue ? null : "1" })} />
          <Toggle label="Show skipped" on={Boolean(filters.includeSkipped)} onClick={() => update({ skipped: filters.includeSkipped ? null : "1" })} />
          <Toggle label="Evidence gaps" on={Boolean(filters.evidenceGap)} onClick={() => update({ gap: filters.evidenceGap ? null : "1" })} />
          <span className="ml-auto flex gap-2">
            <Toggle label="Cards" on={view === "cards"} onClick={() => update({ view: null })} />
            <Toggle label="Table" on={view === "table"} onClick={() => update({ view: "table" })} />
          </span>
          <button type="button" className="text-muted underline" onClick={() => router.replace(basePath)}>
            Clear
          </button>
        </div>
      </div>
      <p className="mb-3 text-sm text-muted">
        {visible.length} shown{readOnly ? " · read only" : ""}
        {!filters.includeSkipped ? " · skipped items hidden" : ""}
      </p>
      {visible.length === 0 ? (
        <EmptyState title="Nothing matches" body="Clear a filter or search a note, provider, or next action." />
      ) : view === "table" ? (
        <LearningTable items={visible} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <LearningCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="text-xs text-muted">
      {label}
      <select className="field mt-1" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 ${on ? "border-accent bg-accent text-accent-ink" : "border-line bg-elev"}`}
      aria-pressed={on}
    >
      {label}
    </button>
  );
}
