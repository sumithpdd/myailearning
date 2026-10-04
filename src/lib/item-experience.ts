import { PROGRESS_LADDER } from "@/lib/career";
import { addDays, formatClock, formatDisplayDate, formatISODate, parseISODate, todayISO } from "@/lib/dates";
import type { AgendaEntry, LearningItem, LearningMilestone, LearningTask } from "@/types/learning";

export type NextMove = {
  kind: "session" | "task" | "written";
  title: string;
  when?: string;
  detail?: string;
};

export type ProgressSlice = {
  label: string;
  percent?: number;
  state?: string;
};

export type NoteEntry = {
  id: string;
  title: string;
  body: string;
  kind: "Notes" | "Takeaways" | "Ideas" | "Questions" | "Evidence";
  when?: string;
};

export type TaskPhase = "Before" | "During" | "After" | "Open";

export function isGathering(type: string): boolean {
  const value = type.toLowerCase();
  return value === "event" || value === "workshop" || value.includes("conference");
}

export function nextMove(item: LearningItem, agenda: AgendaEntry[], tasks: LearningTask[]): NextMove | null {
  const session = agenda
    .filter((entry) => openSession(entry))
    .sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999"))[0];
  if (session) {
    return {
      kind: "session",
      title: session.name,
      when: sessionWhen(session),
      detail: [session.agendaType, session.priority, session.plan].filter(Boolean).join(" · ") || undefined,
    };
  }
  const task = tasks
    .filter(openTask)
    .sort((a, b) => (a.when || a.due || "9999").localeCompare(b.when || b.due || "9999"))[0];
  if (task) {
    return {
      kind: "task",
      title: task.name,
      when: task.when || task.due ? formatDisplayDate(task.when || task.due) : undefined,
      detail: [task.taskType, task.durationMinutes ? `${task.durationMinutes} min` : "", task.priority].filter(Boolean).join(" · ") || undefined,
    };
  }
  if (item.nextAction?.trim()) return { kind: "written", title: item.nextAction.trim() };
  return null;
}

export function progressStory(item: LearningItem, agenda: AgendaEntry[], tasks: LearningTask[]): { overall?: number; slices: ProgressSlice[] } {
  const slices: ProgressSlice[] = [];
  const countedTasks = tasks.filter((task) => (task.status || "").toLowerCase() !== "skipped");
  if (countedTasks.length > 0) {
    const done = countedTasks.filter((task) => !openTask(task)).length;
    slices.push({ label: "Tasks", percent: Math.round((done / countedTasks.length) * 100) });
  }
  const countedSessions = agenda.filter((entry) => (entry.plan || "").toLowerCase() !== "skip");
  if (countedSessions.length > 0) {
    const done = countedSessions.filter((entry) => !openSession(entry)).length;
    slices.push({ label: "Sessions", percent: Math.round((done / countedSessions.length) * 100) });
  }
  const hasEvidence = (item.evidence || []).length > 0 || Boolean(item.outcome);
  if ((item.evidence || []).length > 0 || item.outcome || countedTasks.some((task) => (task.taskType || "").toLowerCase() === "evidence")) {
    slices.push(hasEvidence ? { label: "Evidence", percent: 100 } : { label: "Evidence", state: "Not started" });
  }
  const percents = slices.map((slice) => slice.percent).filter((value): value is number => typeof value === "number");
  return {
    overall: percents.length > 0 ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length) : undefined,
    slices,
  };
}

export function statusWord(status: string): string {
  const value = status.toLowerCase();
  if (value === "completed" || value === "attended") return "Completed";
  if (value === "in progress" || value === "going") return "In progress";
  return "Not started";
}

export function taskPhase(task: LearningTask, item: LearningItem): TaskPhase {
  const point = (task.when || task.due || "").slice(0, 10);
  const start = item.startDate?.slice(0, 10);
  const end = (item.endDate || item.startDate)?.slice(0, 10);
  if (point && start && end) {
    if (point < start) return "Before";
    if (point > end) return "After";
    return "During";
  }
  const type = (task.taskType || "").toLowerCase();
  if (["booking", "preparation", "travel", "prepare"].includes(type)) return "Before";
  if (["follow-up", "evidence", "apply"].includes(type)) return "After";
  if (type === "agenda") return "During";
  return "Open";
}

export function taskBucket(task: LearningTask): "To do" | "In progress" | "Done" | "Skipped" {
  const status = (task.status || "To Do").toLowerCase();
  if (status === "skipped") return "Skipped";
  if (status === "done" || status === "completed") return "Done";
  if (status === "in progress") return "In progress";
  return "To do";
}

export function noteFeed(item: LearningItem, agenda: AgendaEntry[], tasks: LearningTask[]): NoteEntry[] {
  const notes: NoteEntry[] = [];
  if (item.notes?.trim()) notes.push({ id: `${item.id}-notes`, title: item.name, body: item.notes.trim(), kind: classify(item.notes), when: item.updatedAt });
  for (const entry of item.evidence || []) {
    notes.push({ id: `${item.id}-evidence-${entry}`, title: item.name, body: entry, kind: "Evidence" });
  }
  for (const session of agenda) {
    if (session.takeaways?.trim()) notes.push({ id: `${session.id}-takeaways`, title: session.name, body: session.takeaways.trim(), kind: "Takeaways", when: session.start });
    if (session.notes?.trim()) notes.push({ id: `${session.id}-notes`, title: session.name, body: session.notes.trim(), kind: classify(session.notes), when: session.start });
    if (session.followUp?.trim()) notes.push({ id: `${session.id}-follow`, title: session.name, body: session.followUp.trim(), kind: "Ideas", when: session.start });
  }
  for (const task of tasks) {
    if (task.notes?.trim()) notes.push({ id: `${task.id}-notes`, title: task.name, body: task.notes.trim(), kind: classify(task.notes), when: task.when || task.due });
  }
  return notes.sort((a, b) => (b.when || "").localeCompare(a.when || ""));
}

export function nextRung(progress?: string): string | null {
  const index = PROGRESS_LADDER.findIndex((step) => step.toLowerCase() === (progress || "").toLowerCase());
  if (index < 0) return PROGRESS_LADDER[0];
  return PROGRESS_LADDER[index + 1] || null;
}

export function evidenceNeeded(item: LearningItem, milestones: LearningMilestone[]): string | null {
  const related = milestones.filter((milestone) => milestone.learningItemIds.some((id) => same(id, item.id)));
  return related.find((milestone) => milestone.successCriteria)?.successCriteria || related.find((milestone) => milestone.evidence)?.evidence || null;
}

export function dayParts(iso?: string): { day: string; month: string; weekday: string } | null {
  if (!iso) return null;
  const date = parseISODate(iso);
  return {
    day: String(date.getDate()),
    month: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date).toUpperCase(),
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date),
  };
}

export function upcomingGatherings(items: LearningItem[], now = new Date(), withinDays = 21): LearningItem[] {
  const today = todayISO(now);
  const end = formatISODate(addDays(now, withinDays));
  return items
    .filter((item) => !item.archived && isGathering(item.type) && item.startDate && item.startDate.slice(0, 10) >= today && item.startDate.slice(0, 10) <= end)
    .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
}

export function loadMinutes(tasks: LearningTask[], agenda: AgendaEntry[]): { total: number; groups: { label: string; minutes: number }[] } {
  const groups = new Map<string, number>();
  const add = (label: string, minutes: number) => {
    if (minutes <= 0) return;
    groups.set(label, (groups.get(label) || 0) + minutes);
  };
  for (const task of tasks) add(task.priority || "Unset", task.durationMinutes || 0);
  for (const entry of agenda) add(entry.priority || "Unset", spanMinutes(entry.start, entry.end));
  const list = [...groups.entries()].map(([label, minutes]) => ({ label, minutes }));
  return { total: list.reduce((sum, group) => sum + group.minutes, 0), groups: list };
}

function classify(text: string): NoteEntry["kind"] {
  const value = text.trim().toLowerCase();
  if (value.startsWith("question")) return "Questions";
  if (value.startsWith("idea")) return "Ideas";
  if (value.startsWith("key takeaway") || value.startsWith("what i learned")) return "Takeaways";
  if (value.startsWith("evidence")) return "Evidence";
  return "Notes";
}

function sessionWhen(entry: AgendaEntry): string | undefined {
  if (!entry.start) return undefined;
  const day = formatDisplayDate(entry.start);
  const start = formatClock(entry.start);
  const end = formatClock(entry.end);
  if (start && end) return `${day} · ${start}–${end}`;
  if (start) return `${day} · ${start}`;
  return day;
}

function openTask(task: LearningTask): boolean {
  const status = (task.status || "To Do").toLowerCase();
  return status !== "done" && status !== "skipped" && status !== "completed";
}

function openSession(entry: AgendaEntry): boolean {
  const attendance = (entry.attendance || "Planned").toLowerCase();
  return !["attended", "watched", "missed", "cancelled"].includes(attendance) && (entry.plan || "").toLowerCase() !== "skip";
}

function spanMinutes(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const from = Date.parse(start);
  const to = Date.parse(end);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  return Math.round((to - from) / 60000);
}

function same(left: string, right: string): boolean {
  return left.replace(/-/g, "").toLowerCase() === right.replace(/-/g, "").toLowerCase();
}
