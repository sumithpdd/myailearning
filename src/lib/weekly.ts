import { FINISH_LINE, isDoneStatus, isEventType } from "@/lib/constants";
import { addDays, formatISODate, isWithin, parseISODate } from "@/lib/dates";
import { deferrals, focusList } from "@/lib/focus";
import { assessPace } from "@/lib/progress";
import type { BusyInterval, LearningItem } from "@/types/learning";

export function buildWeeklyReport(items: LearningItem[], weekStart: string, now = new Date(), busy: BusyInterval[] = []) {
  const start = parseISODate(weekStart);
  const end = addDays(start, 6);
  const nextStart = addDays(start, 7);
  const nextEnd = addDays(nextStart, 6);
  const horizon = addDays(start, 21);
  const active = items.filter((item) => !item.archived && item.status !== "Skipped");
  return {
    completed: active.filter(
      (item) => item.status === "Completed" && (isWithin(item.updatedAt, start, end) || isWithin(item.deadline, start, end) || isWithin(item.startDate, start, end)),
    ),
    attended: active.filter(
      (item) => isEventType(item.type) && isWithin(item.startDate, start, end) && (item.status === "Attended" || item.status === "Going" || item.status === "Confirmed"),
    ),
    learnedFrom: active.filter((item) => item.status === "In Progress" || isDoneStatus(item.status)).slice(0, 6),
    coming: active
      .filter((item) => isWithin(item.startDate, nextStart, nextEnd))
      .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "")),
    deadlines: active
      .filter((item) => item.deadline && !isDoneStatus(item.status) && isWithin(item.deadline, start, horizon))
      .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || "")),
    focus: focusList(active, now, 5),
    defer: deferrals(active, now, busy, 4),
    pace: assessPace(active, now, busy),
    finish: FINISH_LINE,
  };
}

export function shiftWeek(weekStart: string, amount: number): string {
  return formatISODate(addDays(parseISODate(weekStart), amount * 7));
}
