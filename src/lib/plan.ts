import { isTerminalStatus } from "@/lib/constants";
import { daysUntil, todayISO } from "@/lib/dates";
import { focusList } from "@/lib/focus";
import type { ItemHorizon, LearningItem } from "@/types/learning";

export const HORIZON_ORDER: ItemHorizon[] = ["Now", "3 Months", "6 Months", "9 Months", "12 Months", "12+ Months"];

export function suggestHorizon(item: LearningItem, now = new Date()): ItemHorizon {
  const startDays = item.startDate ? daysUntil(item.startDate, now) : undefined;
  const dueDays = item.deadline ? daysUntil(item.deadline, now) : undefined;
  if (item.status === "In Progress" || item.status === "Going" || item.status === "Confirmed") return "Now";
  if (startDays !== undefined && startDays <= 30) return "Now";
  if (dueDays !== undefined && dueDays <= 30) return "Now";
  if (dueDays !== undefined && dueDays <= 90) return "3 Months";
  if (item.priority === "Core") return "3 Months";
  if (dueDays !== undefined && dueDays <= 180) return "6 Months";
  if (item.priority === "High") return "6 Months";
  if (dueDays !== undefined && dueDays <= 270) return "9 Months";
  if (dueDays !== undefined && dueDays <= 365) return "12 Months";
  return "12+ Months";
}

export function effectiveHorizon(item: LearningItem, now = new Date()): ItemHorizon | undefined {
  if (isTerminalStatus(item.status)) return undefined;
  return item.horizon || suggestHorizon(item, now);
}

export function horizonIsSuggested(item: LearningItem): boolean {
  return !item.horizon && !isTerminalStatus(item.status);
}

export function isNearHorizon(item: LearningItem, now = new Date()): boolean {
  const horizon = effectiveHorizon(item, now);
  return horizon === "Now" || horizon === "3 Months";
}

export function attentionReasons(item: LearningItem, now = new Date()): string[] {
  if (isTerminalStatus(item.status)) return [];
  const reasons: string[] = [];
  if (item.momentum === "At Risk" || item.momentum === "Stalled") reasons.push(item.momentum);
  for (const blocker of item.blockers || []) reasons.push(blocker);
  const today = todayISO(now);
  if (item.reviewDate && item.reviewDate.slice(0, 10) < today) reasons.push("Review date has passed");
  if (item.status === "In Progress") {
    const last = item.lastLearning || item.updatedDate;
    if (!last) reasons.push("No last-learning date");
    else if (daysUntil(last, now) < -21) reasons.push("No learning recorded in 21 days");
  }
  if (item.deadline && daysUntil(item.deadline, now) < 0) reasons.push("Deadline has passed");
  if ((item.status === "Going" || item.status === "Confirmed") && item.endDate && item.endDate.slice(0, 10) < today) {
    reasons.push("Event date has passed");
  }
  if (isNearHorizon(item, now) && (item.priority === "Core" || item.priority === "High")) {
    if (!item.nextAction) reasons.push("Unclear next step");
    if (!item.deadline && !item.startDate) reasons.push("No deadline");
  }
  if (item.timeSlot === "Needs scheduling" && isNearHorizon(item, now)) reasons.push("Needs scheduling");
  if (typeof item.plannedHours === "number" && item.plannedHours > 0 && (item.actualHours ?? 0) === 0 && item.status === "In Progress") {
    reasons.push("Planned hours with no actual hours");
  }
  return [...new Set(reasons)];
}

export function attentionList(items: LearningItem[], now = new Date()) {
  return items
    .map((item) => ({ item, reasons: attentionReasons(item, now) }))
    .filter((entry) => entry.reasons.length > 0)
    .sort((a, b) => b.reasons.length - a.reasons.length || a.item.name.localeCompare(b.item.name));
}

export function nearTermItems(items: LearningItem[], now = new Date()): LearningItem[] {
  return items.filter((item) => isNearHorizon(item, now));
}

export function hourTotals(items: LearningItem[]): { planned: number; actual: number } {
  return items.reduce(
    (sum, item) => ({
      planned: sum.planned + (item.plannedHours ?? 0),
      actual: sum.actual + (item.actualHours ?? 0),
    }),
    { planned: 0, actual: 0 },
  );
}

export function nextLearning(items: LearningItem[], now = new Date()) {
  const near = nearTermItems(items, now);
  const pool = near.length > 0 ? near : items;
  return focusList(pool, now, 4);
}
