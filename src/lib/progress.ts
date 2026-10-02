import {
  FINISH_LINE,
  PLAN_START,
  PRIORITY_WEIGHT,
  WEEKLY_HOURS_TARGET,
  isDoneStatus,
  isEventType,
  isTerminalStatus,
} from "@/lib/constants";
import { addDays, daysBetween, daysUntil, formatDisplayDate, formatISODate, parseISODate, startOfWeek, todayISO } from "@/lib/dates";
import type { BusyInterval, ItemStatus, ItemType, LearningItem } from "@/types/learning";

export function derivedProgress(status: ItemStatus): number {
  switch (status) {
    case "Completed":
    case "Attended":
      return 100;
    case "In Progress":
      return 40;
    case "Going":
    case "Confirmed":
      return 20;
    default:
      return 0;
  }
}

export function effectiveProgress(item: LearningItem): number {
  if (typeof item.progress === "number" && !Number.isNaN(item.progress)) {
    return Math.min(100, Math.max(0, item.progress));
  }
  return derivedProgress(item.status);
}

export function progressIsEstimated(item: LearningItem): boolean {
  return typeof item.progress !== "number";
}

export function defaultHours(type: ItemType, priority: string): number {
  if (isEventType(type)) return 0;
  if (type === "Book") return priority === "Core" || priority === "High" ? 6 : 3;
  if (type === "Course") return 5;
  if (type === "liveProject") return 4;
  if (type === "Video" || type === "Article" || type === "Podcast") return 2;
  return 2;
}

export function remainingHours(item: LearningItem): number {
  if (isTerminalStatus(item.status) || isEventType(item.type)) return 0;
  if (item.priority === "Optional" || item.priority === "Medium") return 0;
  const estimate = item.hoursEstimate ?? defaultHours(item.type, item.priority);
  const remaining = estimate * (1 - effectiveProgress(item) / 100);
  return Math.round(remaining * 10) / 10;
}

export type TrackProgress = {
  id: string;
  label: string;
  percent: number;
  counted: number;
  done: number;
};

export function progressForItems(items: LearningItem[]): number {
  let weight = 0;
  let scored = 0;
  for (const item of items) {
    if (item.status === "Skipped") continue;
    const itemWeight = PRIORITY_WEIGHT[item.priority] ?? 1;
    weight += itemWeight;
    scored += itemWeight * (effectiveProgress(item) / 100);
  }
  if (weight === 0) return 0;
  return Math.round((scored / weight) * 100);
}

export function progressByTrack(
  items: LearningItem[],
  tracks: { id: string; label: string }[],
): TrackProgress[] {
  return tracks.map((track) => {
    const matching = items.filter((item) => item.tracks.includes(track.id));
    const active = matching.filter((item) => item.status !== "Skipped");
    return {
      id: track.id,
      label: track.label,
      percent: progressForItems(matching),
      counted: active.length,
      done: active.filter((item) => isDoneStatus(item.status) || effectiveProgress(item) >= 100).length,
    };
  });
}

export type PaceAssessment = {
  daysRemaining: number;
  daysElapsed: number;
  daysTotal: number;
  expectedPercent: number;
  actualPercent: number;
  corePercent: number;
  status: "ahead" | "on-track" | "behind";
  summary: string;
  capacityHours: number;
  demandHours: number;
};

export function assessPace(
  items: LearningItem[],
  now = new Date(),
  externalBusy: BusyInterval[] = [],
): PaceAssessment {
  const today = todayISO(now);
  const daysTotal = Math.max(1, daysBetween(PLAN_START, FINISH_LINE));
  const daysElapsed = Math.min(daysTotal, Math.max(0, daysBetween(PLAN_START, today)));
  const daysRemaining = Math.max(0, daysUntil(FINISH_LINE, now));
  const expectedPercent = Math.round((daysElapsed / daysTotal) * 100);
  const actualPercent = progressForItems(items);
  const corePercent = progressForItems(items.filter((item) => item.priority === "Core"));
  const demandHours = Math.round(
    items.reduce((sum, item) => sum + remainingHours(item), 0),
  );
  const capacityHours = capacityUntilFinish(items, now, externalBusy);
  let status: PaceAssessment["status"] = "on-track";
  if (corePercent + 8 < expectedPercent) status = "behind";
  else if (corePercent > expectedPercent + 8) status = "ahead";

  const load =
    demandHours > capacityHours
      ? `Core and High study still needs about ${demandHours}h, and a ${WEEKLY_HOURS_TARGET}h week leaves about ${capacityHours}h before ${formatFinish(now)}.`
      : `Core and High study fits inside about ${capacityHours}h of capacity if optional work stays deferred.`;

  const pace =
    status === "behind"
      ? `Core progress is ${corePercent}%. The calendar pace from ${formatDisplayDate(PLAN_START)} is about ${expectedPercent}%.`
      : status === "ahead"
        ? `Core progress is ${corePercent}%, ahead of the ${expectedPercent}% calendar pace.`
        : `Core progress is ${corePercent}%, in range of the ${expectedPercent}% calendar pace.`;

  return {
    daysRemaining,
    daysElapsed,
    daysTotal,
    expectedPercent,
    actualPercent,
    corePercent,
    status,
    summary: `${pace} ${load}`,
    capacityHours,
    demandHours,
  };
}

function formatFinish(_now: Date): string {
  return formatDisplayDate(FINISH_LINE);
}

export function capacityUntilFinish(
  items: LearningItem[],
  now = new Date(),
  externalBusy: BusyInterval[] = [],
): number {
  const finish = parseISODate(FINISH_LINE);
  let cursor = startOfWeek(now);
  let hours = 0;
  while (cursor <= finish) {
    const weekEnd = addDays(cursor, 6);
    const weekItems = items.filter((item) => {
      if (!item.startDate) return false;
      const start = parseISODate(item.startDate);
      return start >= cursor && start <= weekEnd;
    });
    const hasEvent = weekItems.some(
      (item) =>
        isEventType(item.type) &&
        (item.status === "Going" || item.status === "Confirmed" || item.status === "Attended"),
    );
    const hasWork = externalBusy.some((busy) => {
      const start = parseISODate(busy.start);
      return start >= cursor && start <= weekEnd;
    });
    const hasLongEvent = weekItems.some((item) => {
      if (!isEventType(item.type) || !item.startDate || !item.endDate) return false;
      return daysBetween(item.startDate, item.endDate) >= 2;
    });
    if (hasEvent || hasWork || hasLongEvent) hours += 2;
    else hours += WEEKLY_HOURS_TARGET;
    cursor = addDays(cursor, 7);
  }
  return hours;
}

export type WeekLoad = {
  weekStart: string;
  label: string;
  eventCount: number;
  coreDeadlines: number;
  highCount: number;
  heavy: boolean;
  reason?: string;
  events: LearningItem[];
};

export function weekLoads(
  items: LearningItem[],
  now = new Date(),
  weeks = 8,
  externalBusy: BusyInterval[] = [],
): WeekLoad[] {
  const loads: WeekLoad[] = [];
  let cursor = startOfWeek(now);
  for (let index = 0; index < weeks; index += 1) {
    const weekEnd = addDays(cursor, 6);
    const weekStart = formatISODate(cursor);
    const events = items.filter((item) => {
      if (!item.startDate || item.status === "Skipped" || !isEventType(item.type)) return false;
      const start = parseISODate(item.startDate);
      const end = parseISODate(item.endDate || item.startDate);
      return start <= weekEnd && end >= cursor;
    });
    const deadlines = items.filter((item) => {
      if (!item.deadline || isTerminalStatus(item.status)) return false;
      const deadline = parseISODate(item.deadline);
      return deadline >= cursor && deadline <= weekEnd;
    });
    const coreDeadlines = deadlines.filter((item) => item.priority === "Core").length;
    const highCount = items.filter((item) => {
      if (item.priority !== "High" || isTerminalStatus(item.status)) return false;
      const marker = item.deadline || item.startDate;
      if (!marker) return false;
      const date = parseISODate(marker);
      return date >= cursor && date <= weekEnd;
    }).length;
    const workCount = externalBusy.filter((busy) => {
      const start = parseISODate(busy.start);
      return start >= cursor && start <= weekEnd;
    }).length;
    const longEvent = events.some((item) => item.endDate && daysBetween(item.startDate!, item.endDate) >= 2);
    const heavy =
      events.length >= 2 ||
      (events.length >= 1 && workCount > 0) ||
      longEvent ||
      (coreDeadlines >= 1 && highCount >= 2);
    let reason: string | undefined;
    if (heavy) {
      if (longEvent) reason = "Multi-day event. Treat it as the learning block, not an add-on.";
      else if (events.length >= 1 && workCount > 0) reason = "Event plus work commitments. Optional learning should wait.";
      else if (events.length >= 2) reason = "Two or more events. Defer optional study.";
      else reason = "Core deadline alongside several high-priority items.";
    }
    const endLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(weekEnd);
    const startLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(cursor);
    loads.push({
      weekStart,
      label: `${startLabel} – ${endLabel}`,
      eventCount: events.length,
      coreDeadlines,
      highCount,
      heavy,
      reason,
      events,
    });
    cursor = addDays(cursor, 7);
  }
  return loads;
}

export function expiryItems(items: LearningItem[], now = new Date()): LearningItem[] {
  return items
    .filter((item) => {
      if (!item.deadline || isTerminalStatus(item.status)) return false;
      const remaining = daysUntil(item.deadline, now);
      return remaining <= 21;
    })
    .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
}

export function counts(items: LearningItem[], now = new Date()) {
  const today = todayISO(now);
  const active = items.filter((item) =>
    ["In Progress", "Going", "Confirmed"].includes(item.status),
  );
  const coreRemaining = items.filter((item) => item.priority === "Core" && !isTerminalStatus(item.status));
  const high = items.filter((item) => item.priority === "High" && !isTerminalStatus(item.status));
  const upcoming = items.filter((item) => {
    if (!isEventType(item.type) || !item.startDate || item.status === "Skipped") return false;
    return item.startDate.slice(0, 10) >= today || (item.endDate && item.endDate.slice(0, 10) >= today);
  });
  const completed = items.filter((item) => item.status === "Completed");
  const attended = items.filter((item) => item.status === "Attended");
  const expiring = expiryItems(items, now).filter((item) => daysUntil(item.deadline!, now) >= 0);
  const overdue = items.filter((item) => {
    if (!item.deadline || isTerminalStatus(item.status)) return false;
    return daysUntil(item.deadline, now) < 0;
  });
  const staleGoing = items.filter((item) => {
    if ((item.status !== "Going" && item.status !== "Confirmed") || !item.endDate && !item.startDate) return false;
    const end = (item.endDate || item.startDate) as string;
    return end.slice(0, 10) < today;
  });
  return {
    active: active.length,
    coreRemaining: coreRemaining.length,
    high: high.length,
    upcoming: upcoming.length,
    completed: completed.length,
    attended: attended.length,
    expiring: expiring.length,
    overdue: overdue.length,
    daysRemaining: Math.max(0, daysUntil(FINISH_LINE, now)),
    staleGoing,
    upcomingItems: upcoming.sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "")),
    overdueItems: overdue,
    expiringItems: expiring,
  };
}
