import { FINISH_LINE } from "@/lib/constants";
import { daysBetween, eventInstant, formatClock, formatDisplayDate, londonDateKey, londonToday, parseISODate } from "@/lib/dates";
import { taskBucket, taskPhase } from "@/lib/item-experience";
import type { AgendaEntry, LearningItem, LearningMilestone, LearningTask } from "@/types/learning";

export type EventPhase = "before" | "during" | "after";

export type UpNext = {
  entry: AgendaEntry;
  state: "now" | "next";
  minutesUntil?: number;
};

export type SessionClash = {
  id: string;
  day: string;
  primary: AgendaEntry;
  other: AgendaEntry;
  resolved: boolean;
};

export type PlaceCard = {
  id: string;
  kind: string;
  title: string;
  detail?: string;
  when?: string;
  query: string;
};

export type ReadinessGroup = {
  label: string;
  tasks: LearningTask[];
};

const PRIORITY_RANK: Record<string, number> = { must: 0, core: 0, high: 1, medium: 2, optional: 3 };

export function eventPhase(item: LearningItem, now = new Date()): EventPhase {
  const today = londonToday(now);
  const start = item.startDate?.slice(0, 10);
  const end = (item.endDate || item.startDate)?.slice(0, 10);
  if (!start || today < start) return "before";
  if (end && today > end) return "after";
  return "during";
}

export function phaseHeadline(item: LearningItem, agenda: AgendaEntry[], now = new Date()): string | null {
  const start = item.startDate?.slice(0, 10);
  const end = (item.endDate || item.startDate)?.slice(0, 10);
  if (!start || !end) return null;
  const phase = eventPhase(item, now);
  const today = londonToday(now);
  if (phase === "before") {
    const days = daysBetween(today, start);
    if (days <= 0) return "Starts today";
    if (days === 1) return "Starts tomorrow";
    return `Starts in ${days} days`;
  }
  if (phase === "after") return "Event finished";
  const index = daysBetween(start, today) + 1;
  const total = daysBetween(start, end) + 1;
  const kind = dayKind(agenda.filter((entry) => entry.start && londonDateKey(entry.start) === today));
  return kind ? `Day ${index} of ${total} · ${kind}` : `Day ${index} of ${total}`;
}

export function agendaDays(item: LearningItem, agenda: AgendaEntry[]): string[] {
  const days = new Set<string>();
  const start = item.startDate?.slice(0, 10);
  const end = (item.endDate || item.startDate)?.slice(0, 10);
  if (start && end && end >= start) {
    const cursor = parseISODate(start);
    const last = parseISODate(end);
    while (cursor <= last) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, "0");
      const day = String(cursor.getDate()).padStart(2, "0");
      days.add(`${year}-${month}-${day}`);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  for (const entry of agenda) {
    if (!entry.start || isWatchLater(entry)) continue;
    const key = londonDateKey(entry.start);
    if (key) days.add(key);
  }
  return [...days].sort();
}

export function sessionsOnDay(agenda: AgendaEntry[], day: string): AgendaEntry[] {
  return agenda
    .filter((entry) => entry.start && !isWatchLater(entry) && londonDateKey(entry.start) === day)
    .sort(byStart);
}

export function watchLater(agenda: AgendaEntry[]): AgendaEntry[] {
  return agenda.filter(isWatchLater).sort(byStart);
}

export function isWatchLater(entry: AgendaEntry): boolean {
  return (entry.plan || "").toLowerCase().includes("watch");
}

export function isSkippedSession(entry: AgendaEntry): boolean {
  const plan = (entry.plan || "").toLowerCase();
  const attendance = (entry.attendance || "").toLowerCase();
  return plan === "skip" || attendance === "cancelled";
}

export function upNext(agenda: AgendaEntry[], now = new Date()): UpNext | null {
  const live = agenda.filter((entry) => entry.start && !isWatchLater(entry) && !isSkippedSession(entry)).sort(byStart);
  const nowMs = now.getTime();
  for (const entry of live) {
    const start = eventInstant(entry.start || "");
    if (!start) continue;
    const end = eventInstant(entry.end || "") || new Date(start.getTime() + 60 * 60 * 1000);
    if (nowMs >= start.getTime() && nowMs <= end.getTime()) return { entry, state: "now" };
    if (nowMs < start.getTime()) {
      return { entry, state: "next", minutesUntil: Math.max(0, Math.round((start.getTime() - nowMs) / 60_000)) };
    }
  }
  const today = londonToday(now);
  const later = live.find((entry) => londonDateKey(entry.start) >= today);
  return later ? { entry: later, state: "next" } : null;
}

export function sessionClashes(agenda: AgendaEntry[]): SessionClash[] {
  const clashes: SessionClash[] = [];
  const days = new Map<string, AgendaEntry[]>();
  for (const entry of agenda) {
    if (!entry.start || isSkippedSession(entry)) continue;
    const day = londonDateKey(entry.start);
    const list = days.get(day) || [];
    list.push(entry);
    days.set(day, list);
  }
  for (const [day, entries] of days) {
    const sorted = [...entries].sort(byStart);
    for (let left = 0; left < sorted.length; left += 1) {
      for (let right = left + 1; right < sorted.length; right += 1) {
        if (!overlaps(sorted[left], sorted[right])) continue;
        const pair = [sorted[left], sorted[right]];
        const recording = pair.find(isWatchLater);
        const live = pair.find((entry) => !isWatchLater(entry));
        const resolved = Boolean(recording && live);
        const primary = resolved && live ? live : [...pair].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))[0];
        const other = pair.find((entry) => entry.id !== primary.id) || pair[1];
        clashes.push({ id: `${primary.id}:${other.id}`, day, primary, other, resolved });
      }
    }
  }
  return clashes;
}

export function placeCards(item: LearningItem, agenda: AgendaEntry[], tasks: LearningTask[]): PlaceCard[] {
  const cards: PlaceCard[] = [];
  for (const task of tasks) {
    if ((task.taskType || "").toLowerCase() !== "booking") continue;
    const detail = task.notes?.trim();
    cards.push({
      id: task.id,
      kind: "Stay",
      title: task.name,
      detail,
      when: task.due ? formatDisplayDate(task.due) : undefined,
      query: detail || task.name,
    });
  }
  const venues = new Map<string, AgendaEntry[]>();
  for (const entry of agenda) {
    const venue = entry.venue?.trim();
    if (!venue || isWatchLater(entry)) continue;
    const list = venues.get(venue) || [];
    list.push(entry);
    venues.set(venue, list);
  }
  for (const [venue, entries] of venues) {
    const sorted = [...entries].sort(byStart);
    cards.push({
      id: venue,
      kind: placeKind(sorted),
      title: venue,
      when: placeWhen(sorted),
      query: venue,
    });
  }
  const location = item.location?.trim();
  if (location && !cards.some((card) => card.title.toLowerCase() === location.toLowerCase() || card.query.toLowerCase() === location.toLowerCase())) {
    cards.push({ id: `${item.id}-location`, kind: "Location", title: location, query: location });
  }
  return cards;
}

export function readinessGroups(item: LearningItem, tasks: LearningTask[]): { groups: ReadinessGroup[]; done: number; total: number; urgent: string[] } {
  const rows = tasks.filter((task) => taskPhase(task, item) === "Before");
  const grouped = new Map<string, LearningTask[]>();
  for (const task of rows) {
    const label = task.taskType || "Preparation";
    const list = grouped.get(label) || [];
    list.push(task);
    grouped.set(label, list);
  }
  const urgent = rows
    .filter((task) => taskBucket(task) !== "Done" && taskBucket(task) !== "Skipped" && priorityRank(task.priority) <= 1)
    .map((task) => task.id);
  return {
    groups: [...grouped.entries()].map(([label, list]) => ({ label, tasks: list })),
    done: rows.filter((task) => taskBucket(task) === "Done").length,
    total: rows.length,
    urgent,
  };
}

export function followUpTasks(item: LearningItem, tasks: LearningTask[]): LearningTask[] {
  return tasks.filter((task) => {
    const type = (task.taskType || "").toLowerCase();
    return taskPhase(task, item) === "After" || ["follow-up", "evidence", "apply"].includes(type);
  });
}

export function networkingTasks(tasks: LearningTask[], agenda: AgendaEntry[]): { tasks: LearningTask[]; sessions: AgendaEntry[] } {
  return {
    tasks: tasks.filter((task) => (task.taskType || "").toLowerCase() === "networking"),
    sessions: agenda.filter((entry) => (entry.agendaType || "").toLowerCase() === "networking"),
  };
}

export function outcomeLines(item: LearningItem, milestones: LearningMilestone[], tasks: LearningTask[]): { why?: string; outcome?: string; criteria: string[]; evidence: LearningTask[]; due?: string } {
  const related = milestones.filter((milestone) => milestone.learningItemIds.some((id) => id.replace(/-/g, "") === item.id.replace(/-/g, "")));
  const evidence = tasks.filter((task) => (task.taskType || "").toLowerCase() === "evidence");
  const due = [...evidence.map((task) => task.due), ...related.map((milestone) => milestone.target), item.reviewDate]
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  return {
    why: item.why?.trim() || undefined,
    outcome: item.outcome?.trim() || undefined,
    criteria: related.map((milestone) => milestone.successCriteria?.trim() || milestone.name).filter(Boolean),
    evidence,
    due,
  };
}

export function pathMarkers(item: LearningItem, milestones: LearningMilestone[]): { tracks: string[]; finish: string; next?: { name: string; when?: string } } {
  const related = milestones
    .filter((milestone) => milestone.learningItemIds.some((id) => id.replace(/-/g, "") === item.id.replace(/-/g, "")))
    .sort((a, b) => (a.target || "9999").localeCompare(b.target || "9999"));
  const next = related.find((milestone) => (milestone.status || "").toLowerCase() !== "achieved");
  return {
    tracks: item.tracks,
    finish: FINISH_LINE,
    next: next ? { name: next.name, when: next.target } : undefined,
  };
}

export function clockRange(entry: AgendaEntry): string {
  const start = formatClock(entry.start);
  const end = formatClock(entry.end);
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  return "Time not set";
}

export function priorityRank(priority?: string): number {
  return PRIORITY_RANK[(priority || "").toLowerCase()] ?? 4;
}

export function dayTabLabel(day: string): string {
  const date = parseISODate(day);
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date).toUpperCase();
  return `${weekday} ${date.getDate()}`;
}

function dayKind(entries: AgendaEntry[]): string | null {
  const types = new Set(entries.map((entry) => (entry.agendaType || "").toLowerCase()));
  if (types.has("workshop")) return "Training day";
  if (types.has("networking") && types.size === 1) return "Networking";
  if (types.has("session")) return "Conference day";
  if (types.has("travel")) return "Travel day";
  return null;
}

function placeKind(entries: AgendaEntry[]): string {
  const types = new Set(entries.map((entry) => (entry.agendaType || "").toLowerCase()));
  if (types.has("workshop")) return "Training";
  if (types.has("networking") && !types.has("session") && !types.has("workshop")) return "Social";
  if (types.has("travel")) return "Travel";
  if (types.has("meal")) return "Meal";
  return "Venue";
}

function placeWhen(entries: AgendaEntry[]): string | undefined {
  const first = entries[0];
  const days = [...new Set(entries.map((entry) => (entry.start ? londonDateKey(entry.start) : "")).filter(Boolean))];
  const clocks = clockRange(first);
  const span = days.length > 1 ? `${formatDisplayDate(days[0])} – ${formatDisplayDate(days[days.length - 1])}` : formatDisplayDate(days[0]);
  return clocks === "Time not set" ? span : `${span} · ${clocks}`;
}

function overlaps(left: AgendaEntry, right: AgendaEntry): boolean {
  const startA = eventInstant(left.start || "");
  const startB = eventInstant(right.start || "");
  if (!startA || !startB) return false;
  const endA = eventInstant(left.end || "") || new Date(startA.getTime() + 45 * 60_000);
  const endB = eventInstant(right.end || "") || new Date(startB.getTime() + 45 * 60_000);
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

function byStart(left: AgendaEntry, right: AgendaEntry): number {
  return (left.start || "").localeCompare(right.start || "") || left.name.localeCompare(right.name);
}
