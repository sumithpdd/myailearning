import type { LearningItemInput } from "@/types/learning";

export function validateInput(body: unknown): { ok: true; value: LearningItemInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Expected a JSON object." };
  const record = body as Record<string, unknown>;
  const name = stringValue(record.name);
  if (!name) return { ok: false, error: "Name is required." };
  const type = choice(record.type, true);
  const status = choice(record.status, true);
  const priority = choice(record.priority, true);
  if (!type.ok || !type.value) return { ok: false, error: "Type is required." };
  if (!status.ok || !status.value) return { ok: false, error: "Status is required." };
  if (!priority.ok || !priority.value) return { ok: false, error: "Priority is required." };
  const origin = choice(record.origin, false);
  const horizon = choice(record.horizon, false);
  const momentum = choice(record.momentum, false);
  const timeSlot = choice(record.timeSlot, false);
  const blockers = choices(record.blockers);
  const tracks = choices(record.tracks);
  const plannedHours = hoursValue(record.plannedHours);
  const actualHours = hoursValue(record.actualHours);
  if (!origin.ok) return { ok: false, error: "Source is not valid." };
  if (!horizon.ok) return { ok: false, error: "Horizon is not valid." };
  if (!momentum.ok) return { ok: false, error: "Momentum is not valid." };
  if (!timeSlot.ok) return { ok: false, error: "Time slot is not valid." };
  if (!blockers.ok) return { ok: false, error: "A blocker is not valid." };
  if (!tracks.ok) return { ok: false, error: "A track name is not valid." };
  if (!plannedHours.ok || !actualHours.ok) return { ok: false, error: "Hours must be zero or more." };
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
      type: type.value,
      status: status.value,
      priority: priority.value,
      tracks: tracks.value,
      origin: origin.value,
      horizon: horizon.value,
      momentum: momentum.value,
      timeSlot: timeSlot.value,
      blockers: blockers.value,
      why: stringValue(record.why),
      outcome: stringValue(record.outcome),
      plannedHours: plannedHours.value,
      actualHours: actualHours.value,
      lastLearning: dateValue(record.lastLearning),
      reviewDate: dateValue(record.reviewDate),
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

function choice(value: unknown, required: boolean): { ok: true; value?: string } | { ok: false } {
  if (value === undefined || value === null || value === "") return required ? { ok: false } : { ok: true };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 100) return { ok: false };
  return { ok: true, value: trimmed };
}

function choices(value: unknown): { ok: true; value: string[] } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false };
  const next: string[] = [];
  for (const entry of value) {
    const parsed = choice(entry, true);
    if (!parsed.ok || !parsed.value) return { ok: false };
    next.push(parsed.value);
  }
  return { ok: true, value: next };
}

function hoursValue(value: unknown): { ok: true; value?: number } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true };
  const number = Number(value);
  if (Number.isNaN(number) || number < 0) return { ok: false };
  return { ok: true, value: number };
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
