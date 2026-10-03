import { isTerminalStatus } from "@/lib/constants";
import { addDays, formatISODate, startOfWeek, todayISO } from "@/lib/dates";
import type { AgendaEntry, LearningItem, LearningTask } from "@/types/learning";

export type LinkedTask = LearningTask & { parentId?: string; parentName?: string; capability?: string };
export type LinkedSession = AgendaEntry & { parentId?: string; parentName?: string; capability?: string };

export type DayBlock = {
  id: string;
  kind: "task" | "session";
  title: string;
  parentId?: string;
  parentName?: string;
  capability?: string;
  start?: string;
  end?: string;
  date?: string;
  hasTime: boolean;
  durationMinutes?: number;
  taskType?: string;
  priority?: string;
  status?: string;
  notes?: string;
  url?: string;
  completed: boolean;
  overdue: boolean;
};

export type NextStep = {
  id: string;
  kind: "task" | "session" | "item";
  title: string;
  context?: string;
  minutes?: number;
  meta: string[];
  capability?: string;
  line?: string;
  href: string;
  externalUrl?: string;
};

export type NoteCard = {
  id: string;
  kind: "item" | "task" | "session";
  title: string;
  body: string;
  preview: string;
  date?: string;
  parentName: string;
  href: string;
};

export type WeekDay = {
  date: string;
  label: string;
  count: number;
  titles: string[];
};

const NOTE_LABELS = ["Key takeaway", "What I learned", "Useful link", "Question", "Idea to try", "Follow-up action"] as const;
export type NoteLabel = (typeof NOTE_LABELS)[number];

export function noteLabels(): readonly NoteLabel[] {
  return NOTE_LABELS;
}

export function isNoteLabel(value: string): value is NoteLabel {
  return (NOTE_LABELS as readonly string[]).includes(value);
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatDayHeading(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(now);
}

export function dateStamp(date: string, time?: string): string {
  if (!time) return date;
  const [hours, minutes] = time.split(":");
  const local = new Date(`${date}T${hours || "00"}:${minutes || "00"}:00`);
  const offset = -local.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${date}T${hours}:${minutes}:00${sign}${hh}:${mm}`;
}

export function formatMinutes(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return hours === 1 ? "1h" : `${hours}h`;
  return `${rest}m`;
}

export function todayAgenda(tasks: LinkedTask[], sessions: LinkedSession[], now = new Date()): { scheduled: DayBlock[]; unscheduled: DayBlock[] } {
  const today = todayISO(now);
  const scheduled = [
    ...tasks.filter((task) => dateKey(task.due) === today).map((task) => blockFromTask(task, today)),
    ...sessions.filter((session) => dateKey(session.start) === today).map((session) => blockFromSession(session, today)),
  ].sort(byClock);
  if (scheduled.length > 0) return { scheduled, unscheduled: [] };
  const unscheduled = tasks
    .filter((task) => isOpenTask(task) && !task.due)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map((task) => blockFromTask(task, today));
  return { scheduled, unscheduled };
}

export function overdueTasks(tasks: LinkedTask[], now = new Date()): DayBlock[] {
  const today = todayISO(now);
  return tasks
    .filter((task) => isOpenTask(task) && task.due && dateKey(task.due)! < today)
    .sort((a, b) => (a.due || "").localeCompare(b.due || "") || priorityRank(a.priority) - priorityRank(b.priority))
    .map((task) => blockFromTask(task, today));
}

export function comingUp(tasks: LinkedTask[], sessions: LinkedSession[], now = new Date(), limit = 5): DayBlock[] {
  const today = todayISO(now);
  const horizon = formatISODate(addDays(now, 14));
  const blocks = [
    ...tasks
      .filter((task) => isOpenTask(task) && task.due && dateKey(task.due)! > today && dateKey(task.due)! <= horizon)
      .map((task) => blockFromTask(task, today)),
    ...sessions
      .filter((session) => isOpenSession(session) && session.start && dateKey(session.start)! > today && dateKey(session.start)! <= horizon)
      .map((session) => blockFromSession(session, today)),
  ];
  return blocks.sort(byClock).slice(0, limit);
}

export function nextStep(tasks: LinkedTask[], sessions: LinkedSession[], items: LearningItem[], now = new Date()): NextStep | null {
  const today = todayISO(now);
  const overdue = tasks
    .filter((task) => isOpenTask(task) && task.due && dateKey(task.due)! < today && priorityRank(task.priority) === 0)
    .sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  if (overdue[0]) return stepFromTask(overdue[0]);

  const todayOpen = [
    ...tasks.filter((task) => isOpenTask(task) && dateKey(task.due) === today).map((task) => blockFromTask(task, today)),
    ...sessions.filter((session) => isOpenSession(session) && dateKey(session.start) === today).map((session) => blockFromSession(session, today)),
  ].sort(byClock);
  if (todayOpen[0]) return stepFromBlock(todayOpen[0]);

  const core = items
    .filter((item) => !item.archived && item.priority === "Core" && item.status === "In Progress")
    .sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999") || a.name.localeCompare(b.name));
  if (core[0]) return stepFromItem(core[0]);

  const high = tasks
    .filter((task) => isOpenTask(task) && priorityRank(task.priority) <= 1)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || (a.due || "9999").localeCompare(b.due || "9999"));
  if (high[0]) return stepFromTask(high[0]);

  const nearest = items
    .filter((item) => !item.archived && !isTerminalStatus(item.status) && item.deadline && dateKey(item.deadline)! >= today && (item.priority === "Core" || item.priority === "High"))
    .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
  if (nearest[0]) return stepFromItem(nearest[0]);
  return null;
}

export function recentNotes(items: LearningItem[], tasks: LinkedTask[], sessions: LinkedSession[], limit = 6): NoteCard[] {
  const cards: NoteCard[] = [];
  for (const item of items) {
    const body = item.notes?.trim();
    if (!body) continue;
    cards.push({
      id: item.id,
      kind: "item",
      title: item.name,
      body,
      preview: preview(body),
      date: item.updatedAt || item.lastLearning || item.updatedDate,
      parentName: item.capability || item.type,
      href: `/notes?kind=item&id=${item.id}`,
    });
  }
  for (const task of tasks) {
    const body = task.notes?.trim();
    if (!body) continue;
    cards.push({
      id: task.id,
      kind: "task",
      title: task.name,
      body,
      preview: preview(body),
      date: task.due,
      parentName: task.parentName || "Task",
      href: `/notes?kind=task&id=${task.id}`,
    });
  }
  for (const session of sessions) {
    const body = [session.takeaways, session.notes].filter(Boolean).join("\n\n").trim();
    if (!body) continue;
    cards.push({
      id: session.id,
      kind: "session",
      title: session.name,
      body,
      preview: preview(body),
      date: session.start,
      parentName: session.parentName || "Session",
      href: `/notes?kind=session&id=${session.id}`,
    });
  }
  return cards
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function taskViews(tasks: LinkedTask[], now = new Date()): Record<"today" | "upcoming" | "backlog" | "completed", LinkedTask[]> {
  const today = todayISO(now);
  const open = tasks.filter(isOpenTask);
  return {
    today: open.filter((task) => task.due && dateKey(task.due)! <= today).sort(byDue),
    upcoming: open.filter((task) => task.due && dateKey(task.due)! > today).sort(byDue),
    backlog: open.filter((task) => !task.due).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.name.localeCompare(b.name)),
    completed: tasks.filter((task) => !isOpenTask(task)).sort((a, b) => (b.due || "").localeCompare(a.due || "") || a.name.localeCompare(b.name)),
  };
}

export function weekStrip(tasks: LinkedTask[], sessions: LinkedSession[], now = new Date()): WeekDay[] {
  const start = startOfWeek(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = formatISODate(addDays(start, index));
    const titles = [
      ...tasks.filter((task) => dateKey(task.due) === date).map((task) => task.name),
      ...sessions.filter((session) => dateKey(session.start) === date).map((session) => session.name),
    ];
    return {
      date,
      label: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(addDays(start, index)).slice(0, 3),
      count: titles.length,
      titles: titles.slice(0, 3),
    };
  });
}

export function presentTasks(tasks: LinkedTask[], now = new Date()): DayBlock[] {
  const today = todayISO(now);
  return tasks.map((task) => blockFromTask(task, today));
}

export function taskHints(tasks: LinkedTask[]): Record<string, { remaining: number; nextDue?: string }> {
  const hints: Record<string, { remaining: number; nextDue?: string }> = {};
  for (const task of tasks) {
    if (!task.parentId || !isOpenTask(task)) continue;
    const current = hints[task.parentId] || { remaining: 0 };
    current.remaining += 1;
    if (task.due && (!current.nextDue || task.due < current.nextDue)) current.nextDue = task.due;
    hints[task.parentId] = current;
  }
  return hints;
}

export function currentFocus(items: LearningItem[], step: NextStep | null): string | null {
  if (step?.capability) return step.capability;
  const active = items.filter((item) => item.capability && (item.status === "In Progress" || item.priority === "Core") && !isTerminalStatus(item.status));
  const counts = new Map<string, number>();
  for (const item of active) counts.set(item.capability!, (counts.get(item.capability!) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

export function approachingDeadlines(items: LearningItem[], now = new Date()): LearningItem[] {
  const today = todayISO(now);
  const horizon = formatISODate(addDays(now, 21));
  return items
    .filter((item) => !item.archived && !isTerminalStatus(item.status) && item.deadline && dateKey(item.deadline)! >= today && dateKey(item.deadline)! <= horizon)
    .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
}

function stepFromTask(task: LinkedTask): NextStep {
  return {
    id: task.id,
    kind: "task",
    title: task.name,
    context: task.parentName,
    minutes: undefined,
    meta: [task.capability, task.priority, task.taskType].filter((value): value is string => Boolean(value)),
    capability: task.capability,
    line: firstLine(task.notes),
    href: task.parentId ? `/learning/${task.parentId}` : "/tasks",
    externalUrl: task.url,
  };
}

function stepFromBlock(block: DayBlock): NextStep {
  return {
    id: block.id,
    kind: block.kind,
    title: block.title,
    context: block.parentName,
    minutes: block.durationMinutes,
    meta: [block.capability, block.priority, block.taskType].filter((value): value is string => Boolean(value)),
    capability: block.capability,
    line: firstLine(block.notes),
    href: block.parentId ? `/learning/${block.parentId}` : block.kind === "task" ? "/tasks" : "/learning",
    externalUrl: block.url,
  };
}

function stepFromItem(item: LearningItem): NextStep {
  return {
    id: item.id,
    kind: "item",
    title: item.nextAction || item.name,
    context: item.nextAction ? item.name : undefined,
    meta: [item.capability, item.skill, item.priority].filter((value): value is string => Boolean(value)),
    capability: item.capability,
    line: item.nextAction ? undefined : firstLine(item.notes),
    href: `/learning/${item.id}`,
    externalUrl: item.url,
  };
}

function blockFromTask(task: LinkedTask, today: string): DayBlock {
  const date = dateKey(task.due);
  return {
    id: task.id,
    kind: "task",
    title: task.name,
    parentId: task.parentId,
    parentName: task.parentName,
    capability: task.capability,
    start: task.due,
    date,
    hasTime: Boolean(task.due?.includes("T")),
    taskType: task.taskType,
    priority: task.priority,
    status: task.status || "To Do",
    notes: task.notes,
    url: task.url,
    completed: !isOpenTask(task),
    overdue: Boolean(date && date < today && isOpenTask(task)),
  };
}

function blockFromSession(session: LinkedSession, today: string): DayBlock {
  const date = dateKey(session.start);
  const completed = !isOpenSession(session);
  return {
    id: session.id,
    kind: "session",
    title: session.name,
    parentId: session.parentId,
    parentName: session.parentName,
    capability: session.capability,
    start: session.start,
    end: session.end,
    date,
    hasTime: Boolean(session.start?.includes("T")),
    durationMinutes: minutesBetween(session.start, session.end),
    taskType: session.agendaType,
    priority: session.priority,
    status: session.attendance || session.plan,
    notes: session.notes || session.takeaways,
    url: session.url,
    completed,
    overdue: Boolean(date && date < today && !completed),
  };
}

function byClock(a: DayBlock, b: DayBlock): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (a.hasTime !== b.hasTime) return a.hasTime ? -1 : 1;
  return (a.start || "9999").localeCompare(b.start || "9999") || a.title.localeCompare(b.title);
}

function byDue(a: LinkedTask, b: LinkedTask): number {
  return (a.due || "9999").localeCompare(b.due || "9999") || a.name.localeCompare(b.name);
}

function priorityRank(value?: string): number {
  const key = (value || "").toLowerCase();
  if (key === "core" || key === "must") return 0;
  if (key === "high") return 1;
  if (key === "medium") return 2;
  return 3;
}

function isOpenTask(task: LearningTask): boolean {
  const status = (task.status || "To Do").toLowerCase();
  return status !== "done" && status !== "skipped" && status !== "completed";
}

function isOpenSession(entry: AgendaEntry): boolean {
  const attendance = (entry.attendance || "Planned").toLowerCase();
  return !["attended", "watched", "missed", "cancelled"].includes(attendance) && (entry.plan || "").toLowerCase() !== "skip";
}

function dateKey(iso?: string): string | undefined {
  if (!iso) return undefined;
  return iso.slice(0, 10);
}

function minutesBetween(start?: string, end?: string): number | undefined {
  if (!start || !end || !start.includes("T") || !end.includes("T")) return undefined;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  return Math.round(ms / 60_000);
}

function preview(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > 220 ? `${flat.slice(0, 217)}…` : flat;
}

function firstLine(value?: string): string | undefined {
  const line = value?.split("\n").map((part) => part.trim()).find(Boolean);
  if (!line) return undefined;
  return line.length > 180 ? `${line.slice(0, 177)}…` : line;
}
