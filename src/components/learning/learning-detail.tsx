"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, priorityTone, ProgressBar, statusTone } from "@/components/ui";
import { removeItem, saveItem } from "@/lib/client-api";
import { formatDateRange, formatDisplayDate, mapsDirectionsUrl, mapsSearchUrl } from "@/lib/dates";
import { horizonIsSuggested, suggestHorizon } from "@/lib/plan";
import { effectiveProgress, progressIsEstimated } from "@/lib/progress";
import { relatedItems } from "@/lib/filters";
import { RelatedPanels } from "@/components/learning/related-panels";
import type { AgendaEntry, LearningItem, LearningTask, RelatedChoices } from "@/types/learning";

export function LearningDetail({
  item,
  items,
  readOnly,
  statuses,
  agenda = [],
  tasks = [],
  choices,
}: {
  item: LearningItem;
  items: LearningItem[];
  readOnly: boolean;
  statuses: string[];
  agenda?: AgendaEntry[];
  tasks?: LearningTask[];
  choices?: RelatedChoices;
}) {
  const related = relatedItems(items, item);
  const progress = effectiveProgress(item);
  const lines = (item.location || "").split(",").map((part) => part.trim()).filter(Boolean);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="space-y-4">
        <Section title="Overview">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={statusTone(item.status)}>{item.status}</Badge>
            <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
            {item.origin ? <Badge>{item.origin}</Badge> : null}
            <Badge>{item.type}</Badge>
            {item.tracks.map((track) => (
              <Badge key={track}>{track}</Badge>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{[item.origin, item.provider].filter((value, index, all) => value && all.indexOf(value) === index).join(" · ") || "No source yet"}</p>
          {item.offer ? <p className="mt-3 text-sm leading-6">{item.offer}</p> : null}
          <StatusEditor item={item} readOnly={readOnly} statuses={statuses} />
        </Section>
        <RelatedPanels
          agenda={agenda}
          tasks={tasks}
          readOnly={readOnly}
          choices={choices || { attendance: [], plan: [], agendaPriority: [], taskStatus: [], taskType: [], taskPriority: [] }}
        />
        <Section title="Plan">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Fact label="Horizon" value={item.horizon || (horizonIsSuggested(item) ? `Suggested: ${suggestHorizon(item)}` : "—")} />
            <Fact label="Momentum" value={item.momentum || "—"} />
            <Fact label="Time slot" value={item.timeSlot || "—"} />
            <Fact label="Planned hours" value={item.plannedHours === undefined ? "—" : String(item.plannedHours)} />
            <Fact label="Actual hours" value={item.actualHours === undefined ? "—" : String(item.actualHours)} />
            <Fact label="Last learning" value={formatDisplayDate(item.lastLearning)} />
            <Fact label="Review date" value={formatDisplayDate(item.reviewDate)} />
            <Fact label="Blockers" value={(item.blockers || []).join(", ") || "—"} />
          </dl>
          {item.why ? <p className="mt-3 text-sm leading-6">{item.why}</p> : null}
          {item.outcome ? <p className="mt-2 text-sm leading-6">{item.outcome}</p> : null}
        </Section>
        <Section title="Progress">
          <div className="mb-2 flex justify-between text-sm">
            <span>{progressIsEstimated(item) ? "Estimated from status" : "Recorded progress"}</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} />
          <ProgressEditor item={item} readOnly={readOnly} />
        </Section>
        <Section title="Dates and deadline">
          <p>Starts {formatDateRange(item.startDate, item.endDate)}</p>
          <p className="mt-1">Deadline {formatDisplayDate(item.deadline)}</p>
          <p className="mt-1">Completed {formatDisplayDate(item.completedDate)}</p>
          <p className="mt-1">Updated {formatDisplayDate(item.updatedDate)}</p>
          <DateEditor item={item} readOnly={readOnly} />
        </Section>
        <Section title="Location">
          {item.location ? (
            <>
              <p className="font-medium">{lines[0]}</p>
              {lines.slice(1).map((line) => (
                <p key={line} className="text-sm text-muted">
                  {line}
                </p>
              ))}
              <p className="mt-3 flex flex-wrap gap-3 text-sm">
                <a className="font-semibold text-accent" href={mapsSearchUrl(item.location)} target="_blank" rel="noreferrer">
                  Map
                </a>
                <a className="font-semibold text-accent" href={mapsDirectionsUrl(item.location)} target="_blank" rel="noreferrer">
                  Directions
                </a>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">No venue or address yet.</p>
          )}
        </Section>
        <EditableText item={item} field="notes" title="Notes" readOnly={readOnly} empty="No notes yet." />
        <EditableText item={item} field="nextAction" title="Next action" readOnly={readOnly} empty="No next action." />
        <Section title="Links">
          <LinkList item={item} />
        </Section>
        <Section title="Email and confirmation">
          {item.emailUrl ? (
            <a className="text-accent underline" href={item.emailUrl}>
              {item.emailUrl}
            </a>
          ) : (
            <p className="text-sm text-muted">No confirmation link stored. Ticket details may be in the offer or notes.</p>
          )}
        </Section>
        <EvidenceEditor item={item} readOnly={readOnly} />
      </div>
      <div className="space-y-4">
        <Section title="Related items">
          {related.length === 0 ? (
            <p className="text-sm text-muted">No related items on the same tracks.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {related.map((entry) => (
                <li key={entry.id}>
                  <Link href={`/learning/${entry.id}`} className="font-medium hover:text-accent">
                    {entry.name}
                  </Link>
                  <div className="text-xs text-muted">
                    {entry.priority} · {entry.status}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Activity">
          {item.activity && item.activity.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {item.activity
                .slice()
                .reverse()
                .map((entry) => (
                  <li key={`${entry.at}-${entry.summary}`}>
                    <span className="text-muted">{new Date(entry.at).toLocaleString("en-GB")}</span>
                    <div>{entry.summary}</div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Changes made in MyAILearning appear here. Edits made only in Notion are not listed one by one.</p>
          )}
        </Section>
        <DeleteControl item={item} readOnly={readOnly} />
      </div>
    </div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-elev p-4">
      <h2 className="font-serif text-xl">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LinkList({ item }: { item: LearningItem }) {
  const links = [
    item.url ? { href: item.url, label: "Primary link" } : null,
    item.notionUrl ? { href: item.notionUrl, label: "Open in Notion" } : null,
  ].filter((link): link is { href: string; label: string } => Boolean(link));
  if (links.length === 0) return <p className="text-sm text-muted">No links yet.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {links.map((link) => (
        <li key={link.href}>
          <a className="text-accent underline" href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function DateEditor({ item, readOnly }: { item: LearningItem; readOnly: boolean }) {
  const router = useRouter();
  const [completedDate, setCompletedDate] = useState(item.completedDate || "");
  const [updatedDate, setUpdatedDate] = useState(item.updatedDate || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
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
    <label className="mt-4 block text-sm">
      Change status
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
      className="mt-4 flex flex-wrap items-end gap-3"
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
        Set progress
        <input className="field mt-1 w-28" type="number" min={0} max={100} disabled={readOnly} value={value} onChange={(event) => setValue(Number(event.target.value))} />
      </label>
      <button type="submit" disabled={readOnly} className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink disabled:opacity-50">
        Save progress
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}

function EditableText({
  item,
  field,
  title,
  empty,
  readOnly,
}: {
  item: LearningItem;
  field: "notes" | "nextAction";
  title: string;
  empty: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(item[field] || "");
  const [error, setError] = useState<string | null>(null);
  return (
    <Section title={title}>
      <textarea className="field" disabled={readOnly} value={value} placeholder={empty} onChange={(event) => setValue(event.target.value)} />
      <button
        type="button"
        disabled={readOnly}
        className="mt-3 rounded-full border border-line px-4 py-2 text-sm disabled:opacity-50"
        onClick={async () => {
          setError(null);
          try {
            await saveItem(item.id, { [field]: value });
            router.refresh();
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not save.");
          }
        }}
      >
        Save {title.toLowerCase()}
      </button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </Section>
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
    <Section title="Learning evidence">
      <p className="mb-3 text-sm text-muted">A finished course without an artifact is weaker than applied work.</p>
      {evidence.length === 0 ? <p className="text-sm text-muted">No evidence yet.</p> : null}
      <ul className="space-y-2 text-sm">
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
        <input className="field max-w-md" disabled={readOnly} value={draft} placeholder="Architecture diagram, repo, audit, demo…" onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" disabled={readOnly} className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink disabled:opacity-50">
          Add evidence
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </Section>
  );
}

function DeleteControl({ item, readOnly }: { item: LearningItem; readOnly: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="rounded-2xl border border-danger/30 bg-elev p-4">
      <h2 className="font-serif text-xl">Archive</h2>
      <p className="mt-2 text-sm text-muted">Archiving hides the item. In Notion the page is moved to trash rather than permanently deleted.</p>
      <button type="button" disabled={readOnly} className="mt-3 rounded-full border border-danger px-4 py-2 text-sm text-danger disabled:opacity-50" onClick={() => setOpen(true)}>
        Archive item
      </button>
      {open ? (
        <div className="mt-3 rounded-xl border border-line bg-canvas p-3">
          <p className="text-sm">Archive “{item.name}”?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-full bg-[#8d342c] px-4 py-2 text-sm text-white"
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
            <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
