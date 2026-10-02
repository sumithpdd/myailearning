import { FINISH_LINE, isDoneStatus, isEventType, isTerminalStatus } from "@/lib/constants";
import { daysUntil, parseISODate, startOfWeek, formatISODate } from "@/lib/dates";
import { weekLoads } from "@/lib/progress";
import type { BusyInterval, LearningItem } from "@/types/learning";

export type ScoredItem = {
  item: LearningItem;
  score: number;
  reasons: string[];
};

export function rankFocus(items: LearningItem[], now = new Date()): ScoredItem[] {
  const ranked: ScoredItem[] = [];
  for (const item of items) {
    if (item.archived || isTerminalStatus(item.status)) continue;
    let score = 0;
    const reasons: string[] = [];
    if (item.priority === "Core") {
      score += 100;
      reasons.push("Core path");
    } else if (item.priority === "High") {
      score += 55;
      reasons.push("High priority");
    } else if (item.priority === "Medium") {
      score -= 25;
    } else {
      score -= 80;
    }
    if (item.status === "In Progress") {
      score += 45;
      reasons.push("Already in progress");
    }
    if ((item.status === "Going" || item.status === "Confirmed") && isEventType(item.type)) {
      score += 40;
      reasons.push(item.status === "Confirmed" ? "Confirmed event" : "You are going");
    }
    if (item.status === "Considering" && item.priority !== "Core") score -= 20;
    if (item.deadline && !isDoneStatus(item.status)) {
      const remaining = daysUntil(item.deadline, now);
      if (remaining < 0) {
        score += 120;
        reasons.push("Overdue");
      } else if (remaining <= 14) {
        score += 80;
        reasons.push(remaining === 0 ? "Deadline today" : `Deadline in ${remaining} days`);
      } else if (remaining <= 30 && item.priority === "Core") {
        score += 35;
        reasons.push("Core deadline this month");
      }
    }
    if (item.startDate && isEventType(item.type)) {
      const remaining = daysUntil(item.startDate, now);
      const end = item.endDate ? daysUntil(item.endDate, now) : remaining;
      if (remaining <= 14 && end >= 0) {
        score += 70;
        reasons.push(remaining === 0 ? "Happening today" : remaining < 0 ? "In progress this week" : `In ${remaining} days`);
      }
    }
    if (item.nextAction && !isDoneStatus(item.status)) {
      score += 15;
      reasons.push("Next action is waiting");
    }
    if (score >= 40) ranked.push({ item, score, reasons: unique(reasons) });
  }
  return ranked.sort((a, b) => b.score - a.score || (a.item.deadline || "9999").localeCompare(b.item.deadline || "9999"));
}

export function focusList(items: LearningItem[], now = new Date(), limit = 5): ScoredItem[] {
  return rankFocus(items, now).slice(0, limit);
}

export type Deferral = {
  item: LearningItem;
  reason: string;
};

export function deferrals(
  items: LearningItem[],
  now = new Date(),
  externalBusy: BusyInterval[] = [],
  limit = 4,
): Deferral[] {
  const focusIds = new Set(focusList(items, now, 8).map((entry) => entry.item.id));
  const loads = weekLoads(items, now, 10, externalBusy);
  const results: Deferral[] = [];
  const candidates = items.filter((item) => {
    if (item.archived || isTerminalStatus(item.status)) return false;
    if (item.priority !== "Optional" && item.priority !== "Medium") return false;
    if (focusIds.has(item.id)) return false;
    return true;
  });

  for (const item of candidates) {
    const reason = deferReason(item, items, loads, now);
    if (reason) results.push({ item, reason });
  }

  return results
    .sort((a, b) => priorityRank(a.item) - priorityRank(b.item) || (a.item.startDate || "9999").localeCompare(b.item.startDate || "9999"))
    .slice(0, limit);
}

function deferReason(
  item: LearningItem,
  items: LearningItem[],
  loads: ReturnType<typeof weekLoads>,
  now: Date,
): string | null {
  const marker = item.startDate || item.deadline;
  if (marker) {
    const week = formatISODate(startOfWeek(parseISODate(marker)));
    const load = loads.find((entry) => entry.weekStart === week);
    const collision = items.find((other) => {
      if (other.id === item.id || !other.startDate || !isEventType(other.type)) return false;
      if (other.status !== "Going" && other.status !== "Confirmed") return false;
      return formatISODate(startOfWeek(parseISODate(other.startDate))) === week;
    });
    if (collision) {
      return `Same week as ${collision.name}. Events replace study blocks.`;
    }
    if (load?.heavy) return load.reason || "This week is already heavy.";
  }
  if (item.priority === "Optional") return "Optional work sits behind the core path.";
  if (item.status === "Considering" && daysUntil(item.startDate || FINISH_LINE, now) <= 45) {
    return "Still only considering. Leave it until a core block is finished.";
  }
  return null;
}

export function laterDecisions(items: LearningItem[]): LearningItem[] {
  return items
    .filter((item) => {
      if (item.status !== "Considering") return false;
      return item.priority === "High" || item.priority === "Core";
    })
    .sort((a, b) => (a.startDate || "9999").localeCompare(b.startDate || "9999"))
    .slice(0, 6);
}

export function evidenceGaps(items: LearningItem[]): LearningItem[] {
  return items.filter((item) => {
    if (item.priority !== "Core" && item.priority !== "High") return false;
    if (item.status !== "In Progress" && !isDoneStatus(item.status)) return false;
    return !item.evidence || item.evidence.length === 0;
  });
}

function priorityRank(item: LearningItem): number {
  if (item.priority === "Optional") return 0;
  return 1;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
