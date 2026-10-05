"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, priorityTone, ProgressBar, statusTone } from "@/components/ui";
import { createTask, saveAgenda, saveTask } from "@/lib/client-api";
import { calendarUrl, formatDateRange, formatDisplayDate, londonDateKey, londonToday, mapsDirectionsUrl, mapsSearchUrl } from "@/lib/dates";
import {
  agendaDays,
  clockRange,
  dayTabLabel,
  eventPhase,
  followUpTasks,
  networkingTasks,
  outcomeLines,
  pathMarkers,
  phaseHeadline,
  placeCards,
  priorityRank,
  readinessGroups,
  sessionClashes,
  sessionsOnDay,
  upNext,
  watchLater,
  type UpNext,
} from "@/lib/event-centre";
import { sourceGap, taskBucket } from "@/lib/item-experience";
import type { AgendaEntry, LearningItem, LearningMilestone, LearningTask, RelatedChoices, SourceReport } from "@/types/learning";

export function EventCentre({
  item,
  agenda,
  tasks,
  milestones,
  choices,
  sources,
  readOnly,
  onOpenSession,
  onNote,
}: {
  item: LearningItem;
  agenda: AgendaEntry[];
  tasks: LearningTask[];
  milestones: LearningMilestone[];
  choices: RelatedChoices;
  sources?: { agenda: SourceReport; tasks: SourceReport; milestones: SourceReport };
  readOnly: boolean;
  onOpenSession: (id: string) => void;
  onNote: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const phase = eventPhase(item);
  const days = useMemo(() => agendaDays(item, agenda), [item, agenda]);
  const [day, setDay] = useState<string>(() => initialDay(item, days));
  const [showLater, setShowLater] = useState(false);
  const later = useMemo(() => watchLater(agenda), [agenda]);
  const clashes = useMemo(() => sessionClashes(agenda), [agenda]);
  const next = useMemo(() => upNext(agenda), [agenda]);
  const places = useMemo(() => placeCards(item, agenda, tasks), [item, agenda, tasks]);
  const ready = useMemo(() => readinessGroups(item, tasks), [item, tasks]);
  const after = useMemo(
    () => followUpTasks(item, tasks).filter((task) => (task.taskType || "").toLowerCase() !== "evidence"),
    [item, tasks],
  );
  const network = useMemo(() => networkingTasks(tasks, agenda), [tasks, agenda]);
  const outcomes = useMemo(() => outcomeLines(item, milestones, tasks), [item, milestones, tasks]);
  const path = useMemo(() => pathMarkers(item, milestones), [item, milestones]);
  const agendaGap = sourceGap(sources?.agenda);
  const taskGap = sourceGap(sources?.tasks);
  const selected = sessionsOnDay(agenda, day);
  const dayClashes = clashes.filter((clash) => clash.day === day);
  const headline = phaseHeadline(item, agenda);
  const calendar = calendarUrl(item);
  const mapQuery = item.location || places[0]?.query;

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that change.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <header className="lg:col-span-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{item.name}</h1>
            <p className="mt-2 text-sm text-muted sm:text-base">
              {[formatDateRange(item.startDate, item.endDate), item.location && item.location.length <= 48 ? item.location : ""].filter((value) => value && value !== "—").join(" · ")}
            </p>
            {headline ? <p className="mt-2 text-sm font-semibold text-accent">{headline}</p> : null}
          </div>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {item.status ? <li><Badge tone={statusTone(item.status)}>{item.status}</Badge></li> : null}
          {item.priority ? <li><Badge tone={priorityTone(item.priority)}>{item.priority}</Badge></li> : null}
          {item.tracks.map((track) => <li key={track}><Badge>{track}</Badge></li>)}
          {item.type ? <li><Badge>{item.type}</Badge></li> : null}
          {item.provider ? <li><Badge>{item.provider}</Badge></li> : null}
        </ul>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          {item.url ? <a className="text-accent underline-offset-2 hover:underline" href={item.url} target="_blank" rel="noreferrer">Open link</a> : null}
          {item.emailUrl ? <a className="text-accent underline-offset-2 hover:underline" href={item.emailUrl} target="_blank" rel="noreferrer">Email</a> : null}
          {mapQuery ? <a className="text-accent underline-offset-2 hover:underline" href={mapsDirectionsUrl(mapQuery)} target="_blank" rel="noreferrer">Directions</a> : null}
          {calendar ? <a className="text-accent underline-offset-2 hover:underline" href={calendar} target="_blank" rel="noreferrer">Add to calendar</a> : null}
          {item.notionUrl ? <a className="text-accent underline-offset-2 hover:underline" href={item.notionUrl} target="_blank" rel="noreferrer">Notion</a> : null}
        </div>
        <nav className="sticky top-14 z-20 -mx-4 mt-4 flex gap-2 overflow-x-auto border-y border-line bg-canvas/95 px-4 py-2 lg:hidden" aria-label="Event sections">
          <a className="min-h-11 rounded-full border border-line px-3 py-2 text-sm" href="#next">Up next</a>
          <a className="min-h-11 rounded-full border border-line px-3 py-2 text-sm" href="#agenda">Agenda</a>
          <a className="min-h-11 rounded-full border border-line px-3 py-2 text-sm" href="#places">Places</a>
          <a className="min-h-11 rounded-full border border-line px-3 py-2 text-sm" href="#notes">Notes</a>
        </nav>
      </header>

      <div className={`space-y-8 lg:col-span-8 lg:row-start-2 ${phase === "before" ? "order-2 lg:order-none" : ""}`}>
        {next ? (
          <UpNextCard next={next} onOpen={() => onOpenSession(next.entry.id)} onNote={onNote} />
        ) : phase === "after" ? (
          <p className="text-sm text-muted">This event has finished. The notes, recordings, and follow-up below are the remaining work.</p>
        ) : null}

        <section id="agenda" className="scroll-mt-28">
          <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Agenda days">
            {days.map((entry) => (
              <button
                key={entry}
                type="button"
                role="tab"
                aria-selected={!showLater && day === entry}
                className={tabClass(!showLater && day === entry)}
                onClick={() => {
                  setShowLater(false);
                  setDay(entry);
                }}
              >
                {dayTabLabel(entry)}
              </button>
            ))}
            <button type="button" role="tab" aria-selected={showLater} className={tabClass(showLater)} onClick={() => setShowLater(true)}>
              Watch later{later.length > 0 ? ` · ${later.length}` : ""}
            </button>
          </div>

          {agendaGap ? <p className="mt-4 text-sm text-warn">{agendaGap}</p> : null}

          {showLater ? (
            <WatchLaterList entries={later} readOnly={readOnly} onOpen={onOpenSession} onToggle={(entry) => void run(() => markWatched(entry, choices))} />
          ) : (
            <div className="mt-5">
              {dayClashes.map((clash) => (
                <p key={clash.id} className="mb-4 border-l-2 border-brass pl-3 text-sm">
                  {clash.resolved ? (
                    <>
                      <span className="font-semibold">Decision: {clash.primary.name}</span>
                      <span className="mt-1 block text-muted">{clash.other.name} · {clash.other.plan || "Watch later"}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Overlap · {clockRange(clash.primary)}</span>
                      <span className="mt-1 block text-muted">{clash.primary.name} and {clash.other.name} occupy the same time. Keep one live.</span>
                    </>
                  )}
                </p>
              ))}
              {!agendaGap && selected.length === 0 ? <p className="text-sm text-muted">No live sessions are planned for this day.</p> : null}
              <ol className="border-l border-line">
                {selected.map((entry) => (
                  <TimelineRow
                    key={entry.id}
                    entry={entry}
                    readOnly={readOnly}
                    attendedLabel={choice(choices.attendance, "Attended")}
                    onOpen={() => onOpenSession(entry.id)}
                    onToggle={() => void run(() => toggleAttended(entry, choices))}
                  />
                ))}
              </ol>
            </div>
          )}
        </section>

        <OutcomeCard item={item} outcomes={outcomes} readOnly={readOnly} onToggle={(task) => void run(() => toggleTask(task))} />
        <FollowUpCard tasks={after} due={outcomes.due} taskGap={taskGap} readOnly={readOnly} onToggle={(task) => void run(() => toggleTask(task))} />
        <NetworkCard item={item} network={network} choices={choices} readOnly={readOnly} onSaved={() => router.refresh()} />

        <section id="notes" className="scroll-mt-28">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Notes</h2>
          <button type="button" className="mt-3 min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink" onClick={onNote}>
            Add note
          </button>
          {item.notes?.trim() ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">General notes</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{item.notes.trim()}</p>
            </details>
          ) : (
            <p className="mt-3 text-sm text-muted">Session notes and takeaways open from each agenda row.</p>
          )}
          {item.pageContent ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold">Additional notes</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{item.pageContent}</p>
            </details>
          ) : null}
        </section>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      </div>

      <aside className={`space-y-6 lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:sticky lg:top-20 lg:self-start ${phase === "before" ? "order-1 lg:order-none" : ""}`}>
        <ReadinessCard ready={ready} taskGap={taskGap} phase={phase} readOnly={readOnly} onToggle={(task) => void run(() => toggleTask(task))} />
        <section id="places" className="scroll-mt-28">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Trip and places</h2>
          {places.length === 0 ? <p className="mt-3 text-sm text-muted">Locations appear here when a venue or booking is stored.</p> : null}
          <ul className="mt-3 space-y-4">
            {places.map((place) => (
              <li key={place.id}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{place.kind}</p>
                <p className="mt-1 font-medium">{place.title}</p>
                {place.detail ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted">{place.detail}</p> : null}
                {place.when ? <p className="mt-1 text-sm text-muted">{place.when}</p> : null}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                  <a className="min-h-11 py-2 text-accent" href={mapsSearchUrl(place.query)} target="_blank" rel="noreferrer">Open in Maps</a>
                  <a className="min-h-11 py-2 text-accent" href={mapsDirectionsUrl(place.query)} target="_blank" rel="noreferrer">Directions</a>
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">AI career path</h2>
          {path.tracks.length > 0 ? (
            <p className="mt-2 text-sm">Contributes to {path.tracks.join(" · ")}</p>
          ) : (
            <p className="mt-2 text-sm">Not classified yet. <Link className="font-semibold text-accent" href={`/learning/${item.id}/edit`}>Set career connection</Link></p>
          )}
          <p className="mt-2 text-sm text-muted">Finish line {formatDisplayDate(path.finish)}</p>
          {path.next ? (
            <p className="mt-2 text-sm">{path.next.name}{path.next.when ? ` · ${formatDisplayDate(path.next.when)}` : ""}</p>
          ) : null}
          {sourceGap(sources?.milestones) ? <p className="mt-2 text-sm text-warn">{sourceGap(sources?.milestones)}</p> : null}
          <Link href="/path" className="mt-2 inline-block text-sm font-semibold text-accent">Open the path</Link>
        </section>
      </aside>
    </div>
  );
}

function UpNextCard({ next, onOpen, onNote }: { next: UpNext; onOpen: () => void; onNote: () => void }) {
  const clock = formatClockLabel(next);
  return (
    <section id="next" className="scroll-mt-28 border-y border-line py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{next.state === "now" ? "Now" : "Up next"}</p>
      <p className="mt-1 text-sm text-muted">{clock}</p>
      <h2 className="mt-1 text-xl font-semibold leading-7">{next.entry.name}</h2>
      <p className="mt-1 text-sm text-muted">{[mark(next.entry.priority), next.entry.venue, next.entry.speaker].filter(Boolean).join(" · ")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink" onClick={onOpen}>View details</button>
        {next.entry.venue ? (
          <a className="min-h-11 rounded-full border border-line px-4 py-2 text-sm font-semibold" href={mapsDirectionsUrl(next.entry.venue)} target="_blank" rel="noreferrer">Directions</a>
        ) : null}
        <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold" onClick={onNote}>Add note</button>
      </div>
    </section>
  );
}

function TimelineRow({
  entry,
  readOnly,
  attendedLabel,
  onOpen,
  onToggle,
}: {
  entry: AgendaEntry;
  readOnly: boolean;
  attendedLabel: string;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const attended = (entry.attendance || "").toLowerCase() === "attended" || (entry.attendance || "").toLowerCase() === "watched";
  return (
    <li className="relative pb-5 pl-4">
      <span className="absolute -left-1 top-2 h-2 w-2 rounded-full bg-accent" aria-hidden />
      <p className="text-sm text-muted">{clockRange(entry)}</p>
      <button type="button" className="mt-1 text-left" onClick={onOpen}>
        <span className="block text-base font-semibold">{entry.name}</span>
        <span className="mt-1 block text-sm text-muted">{[mark(entry.priority), entry.agendaType, entry.plan, entry.speaker].filter(Boolean).join(" · ")}</span>
      </button>
      {entry.venue ? (
        <a className="mt-1 inline-block min-h-11 py-1 text-sm text-accent" href={mapsDirectionsUrl(entry.venue)} target="_blank" rel="noreferrer">{entry.venue}</a>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm" disabled={readOnly} onClick={onToggle}>
          {attended ? `✓ ${entry.attendance}` : attendedLabel}
        </button>
        <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm" onClick={onOpen}>Notes</button>
      </div>
    </li>
  );
}

function WatchLaterList({
  entries,
  readOnly,
  onOpen,
  onToggle,
}: {
  entries: AgendaEntry[];
  readOnly: boolean;
  onOpen: (id: string) => void;
  onToggle: (entry: AgendaEntry) => void;
}) {
  if (entries.length === 0) return <p className="mt-4 text-sm text-muted">Sessions marked to watch as a recording will queue here.</p>;
  return (
    <div className="mt-4">
      <p className="text-sm text-muted">{entries.length} selected recording{entries.length === 1 ? "" : "s"}</p>
      <ol className="mt-3 divide-y divide-line border-y border-line">
        {entries.map((entry, index) => {
          const watched = (entry.attendance || "").toLowerCase() === "watched";
          return (
            <li key={entry.id} className="flex items-start gap-3 py-3">
              <label className="mt-1 flex min-h-11 items-center gap-2 text-sm">
                <input className="h-5 w-5" type="checkbox" checked={watched} disabled={readOnly} onChange={() => onToggle(entry)} />
                <span className="sr-only">Watched {entry.name}</span>
              </label>
              <button type="button" className="min-w-0 text-left" onClick={() => onOpen(entry.id)}>
                <span className="text-sm text-muted">{index + 1}{entry.priority ? ` · ${entry.priority}` : ""}</span>
                <span className="block font-medium">{entry.name}</span>
                <span className="block text-sm text-muted">{[entry.speaker, entry.takeaways].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ReadinessCard({
  ready,
  taskGap,
  phase,
  readOnly,
  onToggle,
}: {
  ready: ReturnType<typeof readinessGroups>;
  taskGap: string | null;
  phase: ReturnType<typeof eventPhase>;
  readOnly: boolean;
  onToggle: (task: LearningTask) => void;
}) {
  const percent = ready.total > 0 ? Math.round((ready.done / ready.total) * 100) : 0;
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{phase === "after" ? "Preparation" : "Before you go"}</h2>
      {taskGap ? <p className="mt-3 text-sm text-warn">{taskGap}</p> : null}
      {!taskGap && ready.total === 0 ? <p className="mt-3 text-sm text-muted">No preparation tasks are linked yet.</p> : null}
      {ready.total > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-sm">{ready.done} / {ready.total} complete</p>
          <ProgressBar value={percent} />
        </div>
      ) : null}
      {ready.groups.map((group) => (
        <div key={group.label} className="mt-4">
          <h3 className="text-sm font-semibold">{group.label}</h3>
          <ul className="mt-2 space-y-2">
            {group.tasks.map((task) => {
              const done = taskBucket(task) === "Done";
              const urgent = ready.urgent.includes(task.id);
              return (
                <li key={task.id} className={urgent ? "border-l-2 border-brass pl-2" : ""}>
                  <label className="flex min-h-11 items-start gap-3 text-sm">
                    <input className="mt-0.5 h-5 w-5" type="checkbox" checked={done} disabled={readOnly || taskBucket(task) === "Skipped"} onChange={() => onToggle(task)} />
                    <span>
                      {task.name}
                      {urgent ? <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-brass">Priority</span> : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function OutcomeCard({
  item,
  outcomes,
  readOnly,
  onToggle,
}: {
  item: LearningItem;
  outcomes: ReturnType<typeof outcomeLines>;
  readOnly: boolean;
  onToggle: (task: LearningTask) => void;
}) {
  const empty = !outcomes.why && !outcomes.outcome && outcomes.criteria.length === 0 && outcomes.evidence.length === 0;
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Why this is on the plan</h2>
      {empty ? <p className="mt-3 text-sm text-muted">Why, outcome, and success criteria appear when those fields are filled in.</p> : null}
      {outcomes.why ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{outcomes.why}</p> : null}
      {outcomes.outcome ? (
        <p className="mt-3 text-sm"><span className="font-semibold">Afterwards. </span>{outcomes.outcome}</p>
      ) : null}
      {item.tracks.length > 0 ? <p className="mt-3 text-sm text-muted">{item.tracks.join(" → ")}</p> : null}
      {outcomes.criteria.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {outcomes.criteria.map((line) => <li key={line}>{line}</li>)}
        </ul>
      ) : null}
      {outcomes.evidence.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {outcomes.evidence.map((task) => (
            <li key={task.id}>
              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input className="mt-0.5 h-5 w-5" type="checkbox" checked={taskBucket(task) === "Done"} disabled={readOnly} onChange={() => onToggle(task)} />
                <span>{task.name}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function FollowUpCard({
  tasks,
  due,
  taskGap,
  readOnly,
  onToggle,
}: {
  tasks: LearningTask[];
  due?: string;
  taskGap: string | null;
  readOnly: boolean;
  onToggle: (task: LearningTask) => void;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Turn learning into evidence</h2>
      {due ? <p className="mt-2 text-sm font-semibold">Next due {formatDisplayDate(due)}</p> : null}
      {taskGap ? <p className="mt-3 text-sm text-warn">{taskGap}</p> : null}
      {!taskGap && tasks.length === 0 ? <p className="mt-3 text-sm text-muted">Follow-up and evidence tasks for this event will list here.</p> : null}
      <ul className="mt-3 space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input className="mt-0.5 h-5 w-5" type="checkbox" checked={taskBucket(task) === "Done"} disabled={readOnly || taskBucket(task) === "Skipped"} onChange={() => onToggle(task)} />
              <span>
                {task.name}
                {task.due ? <span className="mt-0.5 block text-muted">{formatDisplayDate(task.due)}</span> : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NetworkCard({
  item,
  network,
  choices,
  readOnly,
  onSaved,
}: {
  item: LearningItem;
  network: ReturnType<typeof networkingTasks>;
  choices: RelatedChoices;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const networkingType = choices.taskType.find((type) => type.toLowerCase() === "networking");
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">People and questions</h2>
      {network.sessions.length === 0 && network.tasks.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Networking sessions and contacts saved for this event show up here.</p>
      ) : null}
      <ul className="mt-3 space-y-2 text-sm">
        {network.sessions.map((entry) => <li key={entry.id}>{clockRange(entry)} · {entry.name}</li>)}
        {network.tasks.map((task) => (
          <li key={task.id}>
            {taskBucket(task) === "Done" ? "✓" : "□"} {task.name}
            {task.notes ? <span className="mt-0.5 block text-muted">{task.notes}</span> : null}
          </li>
        ))}
      </ul>
      <form
        className="mt-4 space-y-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim()) return;
          setPending(true);
          setError(null);
          try {
            await createTask({
              name: name.trim(),
              learningItemId: item.id,
              notes: [detail.trim(), url.trim()].filter(Boolean).join("\n") || undefined,
              ...(networkingType ? { taskType: networkingType } : {}),
            });
            setName("");
            setDetail("");
            setUrl("");
            onSaved();
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not save the contact.");
          } finally {
            setPending(false);
          }
        }}
      >
        <input className="field" value={name} disabled={readOnly || pending} onChange={(event) => setName(event.target.value)} placeholder="Person" aria-label="Person" />
        <input className="field" value={detail} disabled={readOnly || pending} onChange={(event) => setDetail(event.target.value)} placeholder="Company, topic, follow-up" aria-label="Company, topic, follow-up" />
        <input className="field" value={url} disabled={readOnly || pending} onChange={(event) => setUrl(event.target.value)} placeholder="Link" aria-label="Contact link" />
        <button type="submit" className="min-h-11 rounded-full border border-line px-4 text-sm" disabled={readOnly || pending || !name.trim()}>
          {pending ? "Saving…" : "Save contact"}
        </button>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </form>
    </section>
  );
}

function formatClockLabel(next: UpNext): string {
  const clock = clockRange(next.entry);
  if (next.state === "now") return `${clock} · Now`;
  if (next.minutesUntil !== undefined && next.minutesUntil < 180) return `${clock} · in ${next.minutesUntil} min`;
  const day = next.entry.start ? formatDisplayDate(londonDateKey(next.entry.start)) : "";
  return [day, clock].filter(Boolean).join(" · ");
}

function mark(priority?: string): string {
  if (!priority) return "";
  if (priorityRank(priority) === 0) return `★ ${priority}`;
  if (priorityRank(priority) === 1) return `▲ ${priority}`;
  return priority;
}

function tabClass(active: boolean): string {
  return active
    ? "min-h-11 shrink-0 rounded-full bg-ink px-3 text-sm font-semibold text-canvas"
    : "min-h-11 shrink-0 rounded-full border border-line px-3 text-sm";
}

function choice(options: string[], preferred: string): string {
  return options.find((option) => option.toLowerCase() === preferred.toLowerCase()) || preferred;
}

function initialDay(item: LearningItem, days: string[]): string {
  const phase = eventPhase(item);
  if (phase === "during" && item.startDate) {
    const today = londonToday();
    if (days.includes(today)) return today;
  }
  return days[0] || "";
}

async function toggleTask(task: LearningTask): Promise<void> {
  const done = taskBucket(task) === "Done";
  await saveTask(task.id, { status: done ? "To Do" : "Done" });
}

async function toggleAttended(entry: AgendaEntry, choices: RelatedChoices): Promise<void> {
  const attended = (entry.attendance || "").toLowerCase() === "attended";
  await saveAgenda(entry.id, { attendance: choice(choices.attendance, attended ? "Planned" : "Attended") });
}

async function markWatched(entry: AgendaEntry, choices: RelatedChoices): Promise<void> {
  const watched = (entry.attendance || "").toLowerCase() === "watched";
  await saveAgenda(entry.id, { attendance: choice(choices.attendance, watched ? "Planned" : "Watched") });
}

