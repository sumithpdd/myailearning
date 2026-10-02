import { ITEM_PRIORITIES, ITEM_STATUSES, ITEM_TYPES, TRACK_IDS } from "@/lib/constants";
import type { LearningItemInput } from "@/types/learning";

export function validateInput(body: unknown): { ok: true; value: LearningItemInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Expected a JSON object." };
  const record = body as Record<string, unknown>;
  const name = stringValue(record.name);
  if (!name) return { ok: false, error: "Name is required." };
  const type = ITEM_TYPES.find((item) => item === record.type);
  const status = ITEM_STATUSES.find((item) => item === record.status);
  const priority = ITEM_PRIORITIES.find((item) => item === record.priority);
  if (!type) return { ok: false, error: "Type is not recognised." };
  if (!status) return { ok: false, error: "Status is not recognised." };
  if (!priority) return { ok: false, error: "Priority is not recognised." };
  const tracks = Array.isArray(record.tracks) ? record.tracks.filter((track): track is string => typeof track === "string") : [];
  const unknownTrack = tracks.find((track) => !TRACK_IDS.includes(track) && track.trim().length > 40);
  if (unknownTrack) return { ok: false, error: "A track name is too long." };
  const progress = record.progress === undefined || record.progress === null || record.progress === ""
    ? undefined
    : Number(record.progress);
  if (progress !== undefined && (Number.isNaN(progress) || progress < 0 || progress > 100)) {
    return { ok: false, error: "Progress must be between 0 and 100." };
  }
  return {
    ok: true,
    value: {
      name,
      type,
      status,
      priority,
      tracks,
      provider: stringValue(record.provider),
      startDate: dateValue(record.startDate),
      endDate: dateValue(record.endDate),
      deadline: dateValue(record.deadline),
      completedDate: dateValue(record.completedDate),
      updatedDate: dateValue(record.updatedDate),
      location: stringValue(record.location),
      url: stringValue(record.url),
      emailUrl: stringValue(record.emailUrl),
      notes: stringValue(record.notes),
      nextAction: stringValue(record.nextAction),
      offer: stringValue(record.offer),
      progress,
      evidence: stringList(record.evidence),
      cost: record.cost === undefined || record.cost === null || record.cost === "" ? undefined : Number(record.cost),
      currency: stringValue(record.currency),
      hoursEstimate: record.hoursEstimate === undefined || record.hoursEstimate === "" ? undefined : Number(record.hoursEstimate),
      sessions: Array.isArray(record.sessions) ? record.sessions as LearningItemInput["sessions"] : undefined,
      checklist: record.checklist && typeof record.checklist === "object" ? record.checklist as Record<string, boolean> : undefined,
    },
  };
}

export function mergeInput(current: LearningItemInput, patch: Record<string, unknown>): unknown {
  return { ...current, ...patch };
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function dateValue(value: unknown): string | undefined {
  const text = stringValue(value);
  if (!text) return undefined;
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : undefined;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split("\n").map((item) => item.trim()).filter(Boolean);
  return [];
}
