import { isTerminalStatus } from "@/lib/constants";
import { daysUntil, formatISODate, startOfWeek, addDays } from "@/lib/dates";
import { focusList } from "@/lib/focus";
import type { LearningItem } from "@/types/learning";

export const PROGRESS_LADDER = ["Beginner", "Working", "Applied", "Expert"] as const;

export type NextAction = {
  item: LearningItem;
  reasons: string[];
};

export type CapabilityStanding = {
  name: string;
  open: number;
  progress: string;
  evidence: number;
};

export function nextLearningAction(items: LearningItem[], now = new Date()): NextAction | null {
  const ranked = focusList(items, now, 12);
  const onPath = ranked.find((entry) => entry.item.capability);
  const chosen = onPath || ranked[0];
  if (!chosen) return null;
  const reasons = [...chosen.reasons];
  if (chosen.item.capability) reasons.unshift(chosen.item.capability);
  if (chosen.item.skill) reasons.splice(1, 0, chosen.item.skill);
  if (chosen.item.nextAction) reasons.push(chosen.item.nextAction);
  return { item: chosen.item, reasons: unique(reasons) };
}

export function weekItems(items: LearningItem[], now = new Date()): LearningItem[] {
  const start = startOfWeek(now);
  const end = formatISODate(addDays(start, 6));
  const begin = formatISODate(start);
  return items
    .filter((item) => !item.archived && !isTerminalStatus(item.status))
    .filter((item) => inWeek(item, begin, end) || item.status === "In Progress")
    .sort((a, b) => (a.startDate || a.deadline || "9999").localeCompare(b.startDate || b.deadline || "9999") || a.name.localeCompare(b.name))
    .slice(0, 8);
}

export function careerPath(items: LearningItem[], capabilities: string[]): CapabilityStanding[] {
  return capabilities.map((name) => {
    const matching = items.filter((item) => item.capability === name && !isTerminalStatus(item.status) && item.status !== "Skipped");
    const finished = items.filter((item) => item.capability === name);
    return {
      name,
      open: matching.length,
      progress: bestProgress(finished),
      evidence: finished.filter(hasEvidence).length,
    };
  });
}

export function skillGaps(items: LearningItem[], skills: string[]): { skill: string; reason: string }[] {
  return skills.flatMap((skill) => {
    const matching = items.filter((item) => item.skill === skill && item.status !== "Skipped");
    if (matching.length === 0) return [{ skill, reason: "No learning item is attached yet." }];
    const applied = matching.some((item) => rank(item.careerProgress) >= rank("Applied") || hasEvidence(item));
    if (applied) return [];
    const active = matching.some((item) => item.status === "In Progress" || item.status === "Going");
    return [{ skill, reason: active ? "In progress, with no applied evidence yet." : "Started on the plan, not yet in progress." }];
  });
}

export function evidenceItems(items: LearningItem[]): LearningItem[] {
  return items.filter(hasEvidence).slice(0, 12);
}

export function unclassifiedItems(items: LearningItem[]): LearningItem[] {
  return items.filter(
    (item) =>
      !item.archived &&
      !isTerminalStatus(item.status) &&
      !item.capability &&
      (item.priority === "Core" || item.priority === "High" || item.status === "In Progress"),
  );
}

export function hasEvidence(item: LearningItem): boolean {
  return (item.evidence || []).length > 0 || Boolean(item.outcome) || rank(item.careerProgress) >= rank("Applied");
}

function inWeek(item: LearningItem, begin: string, end: string): boolean {
  const points = [item.startDate, item.endDate, item.deadline, item.reviewDate].filter((value): value is string => Boolean(value));
  if (points.some((value) => value.slice(0, 10) >= begin && value.slice(0, 10) <= end)) return true;
  if (item.startDate && item.endDate && item.startDate.slice(0, 10) <= end && item.endDate.slice(0, 10) >= begin) return true;
  return false;
}

function bestProgress(items: LearningItem[]): string {
  let best = "";
  for (const item of items) {
    if (rank(item.careerProgress) > rank(best)) best = item.careerProgress || "";
  }
  return best || "Not started";
}

function rank(value?: string): number {
  const index = PROGRESS_LADDER.findIndex((step) => step.toLowerCase() === (value || "").toLowerCase());
  return index;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function hoursThisWeek(items: LearningItem[], now = new Date()): number {
  return weekItems(items, now).reduce((sum, item) => sum + (item.plannedHours || 0), 0);
}

export function daysLabel(item: LearningItem, now = new Date()): string {
  const target = item.startDate || item.deadline;
  if (!target) return item.status;
  const days = daysUntil(target, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 8) return `In ${days} days`;
  return item.status;
}
