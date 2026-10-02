import { canonicalTracks, notionTrackName } from "@/lib/constants";
import { embedMeta, readMeta, stripMeta } from "@/lib/meta";
import { findProperty, optionNames, optionOrFallback, type NotionSchema } from "@/lib/notion/schema";
import type { NotionPage } from "@/lib/notion/client";
import type { ItemMeta, ItemType, LearningItem, LearningItemInput } from "@/types/learning";

type RichText = { plain_text?: string };
type SelectValue = { name?: string } | null;
type DateValue = { start?: string | null; end?: string | null } | null;

type PropertyBag = Record<string, unknown>;

const LEGACY_TYPES: Record<string, ItemType> = {
  Conference: "Event",
  Webinar: "Event",
  Learning: "Course",
  Other: "Event",
};
export function mapNotionPage(page: NotionPage, schema?: NotionSchema): LearningItem {
  const properties = page.properties || {};
  const resolved = schema ?? schemaFromPage(properties);
  const notesRaw = readRich(properties, findProperty(resolved, "notes")?.name || "Notes");
  const meta = readMeta(notesRaw);
  const notionType = canonicalType(readSelect(properties, findProperty(resolved, "type")?.name || "Type"));
  const notionStatus = readSelect(properties, findProperty(resolved, "status")?.name || "Status") || "To Do";
  const type = meta.typeDetail || notionType;
  const status = meta.statusDetail || notionStatus;
  const date = readDate(properties, findProperty(resolved, "date")?.name || "Date");
  const deadline = readDate(properties, findProperty(resolved, "deadline")?.name || "Deadline");
  const completed = readDate(properties, findProperty(resolved, "completedDate")?.name || "Completed date");
  const updated = readDate(properties, findProperty(resolved, "updatedDate")?.name || "Updated date");
  const lastLearning = readDate(properties, findProperty(resolved, "lastLearning")?.name || "Last Learning");
  const reviewDate = readDate(properties, findProperty(resolved, "reviewDate")?.name || "Review Date");
  const progressProperty = findProperty(resolved, "progress");
  const propertyProgress = progressProperty ? readNumber(properties, progressProperty.name) : undefined;
  const costProperty = findProperty(resolved, "cost");
  const propertyCost = costProperty ? readNumber(properties, costProperty.name) : undefined;

  return {
    id: page.id,
    name: readTitle(properties, resolved.titleProperty) || "Untitled",
    type,
    status,
    priority: readSelect(properties, findProperty(resolved, "priority")?.name || "Priority") || "Medium",
    tracks: canonicalTracks(readMulti(properties, findProperty(resolved, "track")?.name || "Track")),
    origin: readSelect(properties, findProperty(resolved, "origin")?.name || "Source") || undefined,
    horizon: readSelect(properties, findProperty(resolved, "horizon")?.name || "Horizon") || undefined,
    momentum: readSelect(properties, findProperty(resolved, "momentum")?.name || "Momentum") || undefined,
    timeSlot: readSelect(properties, findProperty(resolved, "timeSlot")?.name || "Time Slot") || undefined,
    blockers: readMulti(properties, findProperty(resolved, "blocker")?.name || "Blocker"),
    why: readRich(properties, findProperty(resolved, "why")?.name || "Why") || undefined,
    outcome: readRich(properties, findProperty(resolved, "outcome")?.name || "Outcome") || undefined,
    plannedHours: readNumber(properties, findProperty(resolved, "plannedHours")?.name || "Planned Hours"),
    actualHours: readNumber(properties, findProperty(resolved, "actualHours")?.name || "Actual Hours"),
    lastLearning: lastLearning?.start ? lastLearning.start.slice(0, 10) : undefined,
    reviewDate: reviewDate?.start ? reviewDate.start.slice(0, 10) : undefined,
    provider: readRich(properties, findProperty(resolved, "provider")?.name || "Provider") || undefined,
    startDate: date?.start ? date.start.slice(0, 10) : undefined,
    endDate: date?.end ? date.end.slice(0, 10) : undefined,
    deadline: deadline?.start ? deadline.start.slice(0, 10) : undefined,
    completedDate: completed?.start ? completed.start.slice(0, 10) : undefined,
    updatedDate: updated?.start ? updated.start.slice(0, 10) : undefined,
    location: readRich(properties, findProperty(resolved, "location")?.name || "Location") || undefined,
    url: readUrl(properties, findProperty(resolved, "link")?.name || "Link"),
    emailUrl: readUrl(properties, findProperty(resolved, "email")?.name || "Email"),
    notes: stripMeta(notesRaw) || undefined,
    nextAction: readRich(properties, findProperty(resolved, "nextAction")?.name || "Next Action") || undefined,
    offer: readRich(properties, findProperty(resolved, "offer")?.name || "Offer") || undefined,
    progress: propertyProgress ?? meta.progress,
    cost: propertyCost ?? meta.cost,
    currency: meta.currency,
    evidence: meta.evidence || [],
    notionUrl: page.url,
    updatedAt: page.last_edited_time,
    createdAt: page.created_time,
    archived: Boolean(page.archived || page.in_trash),
    hoursEstimate: meta.hoursEstimate,
    sessions: meta.sessions || [],
    checklist: meta.checklist || {},
    activity: meta.activity || [],
    source: "notion",
  };
}

export function toNotionProperties(
  input: LearningItemInput,
  schema: NotionSchema,
  previous?: LearningItem,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const meta = buildMeta(input, schema, previous);
  const title = findProperty(schema, "name");
  if (title) properties[title.name] = { title: textChunks(input.name || "Untitled") };

  const typeProperty = findProperty(schema, "type");
  if (typeProperty) {
    const written = optionOrFallback(input.type, typeProperty.options, typeFallback(input.type));
    if (written && (typeProperty.type === "select" || typeProperty.type === "status")) {
      properties[typeProperty.name] = { [typeProperty.type]: { name: written } };
    }
  }

  const statusProperty = findProperty(schema, "status");
  if (statusProperty) {
    const written = optionOrFallback(input.status, statusProperty.options, statusFallback(input.status));
    if (written && (statusProperty.type === "select" || statusProperty.type === "status")) {
      properties[statusProperty.name] = { [statusProperty.type]: { name: written } };
    }
  }

  const priorityProperty = findProperty(schema, "priority");
  if (priorityProperty) {
    const written = optionOrFallback(input.priority, priorityProperty.options, ["Medium"]);
    if (written) properties[priorityProperty.name] = { select: { name: written } };
  }

  const trackProperty = findProperty(schema, "track");
  if (trackProperty) {
    const names = input.tracks
      .map((track) => notionTrackName(track, optionNames(trackProperty.options)))
      .filter((track): track is string => Boolean(track));
    properties[trackProperty.name] = { multi_select: names.map((name) => ({ name })) };
  }

  writeSelect(properties, schema, "origin", input.origin);
  writeSelect(properties, schema, "horizon", input.horizon);
  writeSelect(properties, schema, "momentum", input.momentum);
  writeSelect(properties, schema, "timeSlot", input.timeSlot);
  writeMulti(properties, schema, "blocker", input.blockers || []);
  writeRich(properties, schema, "why", input.why);
  writeRich(properties, schema, "outcome", input.outcome);
  writeNumber(properties, schema, "plannedHours", input.plannedHours);
  writeNumber(properties, schema, "actualHours", input.actualHours);
  writeRich(properties, schema, "provider", input.provider);
  writeRich(properties, schema, "location", input.location);
  writeRich(properties, schema, "notes", fitNotes(input.notes, meta));
  writeRich(properties, schema, "nextAction", input.nextAction);
  writeRich(properties, schema, "offer", input.offer);
  writeUrl(properties, schema, "link", input.url);
  writeUrl(properties, schema, "email", input.emailUrl);
  writeDate(properties, schema, "date", input.startDate, input.endDate);
  writeDate(properties, schema, "deadline", input.deadline, undefined);
  writeDate(properties, schema, "completedDate", input.completedDate, undefined);
  writeDate(properties, schema, "updatedDate", input.updatedDate, undefined);
  writeDate(properties, schema, "lastLearning", input.lastLearning, undefined);
  writeDate(properties, schema, "reviewDate", input.reviewDate, undefined);

  const progressProperty = findProperty(schema, "progress");
  if (progressProperty?.type === "number") {
    properties[progressProperty.name] = { number: typeof input.progress === "number" ? input.progress : null };
  }
  const costProperty = findProperty(schema, "cost");
  if (costProperty?.type === "number") {
    properties[costProperty.name] = { number: typeof input.cost === "number" ? input.cost : null };
  }

  return properties;
}

export function activitySummary(previous: LearningItem | undefined, input: LearningItemInput): string {
  if (!previous) return "Created";
  const changes: string[] = [];
  if (previous.status !== input.status) changes.push(`status → ${input.status}`);
  if (previous.priority !== input.priority) changes.push(`priority → ${input.priority}`);
  if ((previous.progress ?? null) !== (input.progress ?? null)) changes.push(`progress → ${input.progress ?? "estimated"}%`);
  if ((previous.nextAction || "") !== (input.nextAction || "")) changes.push("next action");
  if ((previous.notes || "") !== (input.notes || "")) changes.push("notes");
  if ((previous.deadline || "") !== (input.deadline || "")) changes.push("deadline");
  if ((previous.startDate || "") !== (input.startDate || "")) changes.push("date");
  if ((previous.completedDate || "") !== (input.completedDate || "")) changes.push("completed date");
  if ((previous.updatedDate || "") !== (input.updatedDate || "")) changes.push("updated date");
  if (JSON.stringify(previous.evidence || []) !== JSON.stringify(input.evidence || [])) changes.push("evidence");
  if (JSON.stringify(previous.tracks) !== JSON.stringify(input.tracks)) changes.push("tracks");
  if ((previous.origin || "") !== (input.origin || "")) changes.push(`source → ${input.origin || "cleared"}`);
  if ((previous.horizon || "") !== (input.horizon || "")) changes.push(`horizon → ${input.horizon || "cleared"}`);
  if ((previous.momentum || "") !== (input.momentum || "")) changes.push(`momentum → ${input.momentum || "cleared"}`);
  if (changes.length === 0) return "Updated";
  return `Updated ${changes.join(", ")}`;
}

function buildMeta(input: LearningItemInput, schema: NotionSchema, previous?: LearningItem): ItemMeta {
  const typeProperty = findProperty(schema, "type");
  const statusProperty = findProperty(schema, "status");
  const writtenType = typeProperty
    ? optionOrFallback(input.type, typeProperty.options, typeFallback(input.type))
    : input.type;
  const writtenStatus = statusProperty
    ? optionOrFallback(input.status, statusProperty.options, statusFallback(input.status))
    : input.status;
  const meta: ItemMeta = {
    evidence: input.evidence || [],
    currency: input.currency,
    sessions: input.sessions || previous?.sessions || [],
    checklist: input.checklist || previous?.checklist || {},
    activity: previous?.activity ? [...previous.activity] : [],
    hoursEstimate: input.hoursEstimate,
  };
  if (!findProperty(schema, "progress") && typeof input.progress === "number") meta.progress = input.progress;
  if (!findProperty(schema, "cost") && typeof input.cost === "number") meta.cost = input.cost;
  if (writtenType && writtenType !== input.type) meta.typeDetail = input.type;
  if (writtenStatus && writtenStatus !== input.status) meta.statusDetail = input.status;
  meta.activity = [...(meta.activity || []), { at: new Date().toISOString(), summary: activitySummary(previous, input) }].slice(-12);
  return meta;
}

function canonicalType(value: string): ItemType {
  if (!value) return "Course";
  return LEGACY_TYPES[value] || value;
}

function typeFallback(type: ItemType): string[] {
  return [type, "Course", "Event"];
}

function writeSelect(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: "origin" | "horizon" | "momentum" | "timeSlot",
  value: string | undefined,
) {
  const property = findProperty(schema, field);
  if (!property || (property.type !== "select" && property.type !== "status" && property.type !== "unknown")) return;
  if (!value) {
    properties[property.name] = { select: null };
    return;
  }
  const written = optionOrFallback(value, property.options, [value]);
  if (written) properties[property.name] = { select: { name: written } };
}

function statusFallback(status: string): string[] {
  if (status === "Confirmed") return ["Going", "To Do"];
  return ["To Do"];
}

function writeRich(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: "provider" | "location" | "notes" | "nextAction" | "offer" | "why" | "outcome",
  value: string | undefined,
) {
  const property = findProperty(schema, field);
  if (!property) return;
  properties[property.name] = { rich_text: value ? textChunks(value) : [] };
}

function writeUrl(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: "link" | "email",
  value: string | undefined,
) {
  const property = findProperty(schema, field);
  if (!property) return;
  properties[property.name] = { url: value || null };
}

function writeDate(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: "date" | "deadline" | "completedDate" | "updatedDate" | "lastLearning" | "reviewDate",
  start: string | undefined,
  end: string | undefined,
) {
  const property = findProperty(schema, field);
  if (!property) return;
  if (!start) {
    properties[property.name] = { date: null };
    return;
  }
  properties[property.name] = {
    date: {
      start,
      end: end && end !== start ? end : null,
    },
  };
}

function fitNotes(notes: string | undefined, meta: ItemMeta): string {
  const embedded = embedMeta(notes, meta);
  if (embedded.length <= 1900) return embedded;
  const marker = embedded.match(/\n*<!-- myailearning:[\s\S]*? -->$/)?.[0] || "";
  const room = Math.max(0, 1900 - marker.length);
  return `${(notes || "").slice(0, room).trim()}${marker}`;
}

function textChunks(value: string): { type: "text"; text: { content: string } }[] {
  const text = value.slice(0, 2000);
  return [{ type: "text", text: { content: text } }];
}

function schemaFromPage(properties: PropertyBag): NotionSchema {
  const parsed = Object.keys(properties).map((name) => ({
    name,
    type: "unknown" as const,
  }));
  const title = parsed.find((property) => property.name.toLowerCase() === "name") || parsed[0];
  return { properties: parsed, titleProperty: title?.name || "Name" };
}

function bag(properties: PropertyBag, name: string): PropertyBag | undefined {
  const direct = properties[name];
  if (direct && typeof direct === "object") return direct as PropertyBag;
  const found = Object.entries(properties).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return found && typeof found[1] === "object" ? (found[1] as PropertyBag) : undefined;
}

function readTitle(properties: PropertyBag, name: string): string {
  const property = bag(properties, name);
  const title = property?.title;
  if (Array.isArray(title)) return title.map((part) => (part as RichText).plain_text || "").join("").trim();
  return "";
}

function readRich(properties: PropertyBag, name: string): string {
  const property = bag(properties, name);
  const rich = property?.rich_text;
  if (Array.isArray(rich)) return rich.map((part) => (part as RichText).plain_text || "").join("").trim();
  return "";
}

function readSelect(properties: PropertyBag, name: string): string {
  const property = bag(properties, name);
  const select = (property?.select || property?.status) as SelectValue;
  return select?.name || "";
}

function readMulti(properties: PropertyBag, name: string): string[] {
  const property = bag(properties, name);
  const multi = property?.multi_select;
  if (!Array.isArray(multi)) return [];
  return multi.map((option) => (option as SelectValue)?.name || "").filter(Boolean);
}

function readUrl(properties: PropertyBag, name: string): string | undefined {
  const property = bag(properties, name);
  return typeof property?.url === "string" && property.url ? property.url : undefined;
}

function readDate(properties: PropertyBag, name: string): { start?: string; end?: string } | undefined {
  const property = bag(properties, name);
  const date = property?.date as DateValue;
  if (!date?.start) return undefined;
  return { start: date.start, end: date.end || undefined };
}

function readNumber(properties: PropertyBag, name: string): number | undefined {
  const property = bag(properties, name);
  return typeof property?.number === "number" ? property.number : undefined;
}

function writeMulti(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: "blocker",
  values: string[],
) {
  const property = findProperty(schema, field);
  if (!property) return;
  const names = values
    .map((value) => optionOrFallback(value, property.options, [value]))
    .filter((value): value is string => Boolean(value));
  properties[property.name] = { multi_select: names.map((name) => ({ name })) };
}

function writeNumber(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: "plannedHours" | "actualHours",
  value: number | undefined,
) {
  const property = findProperty(schema, field);
  if (!property || (property.type !== "number" && property.type !== "unknown")) return;
  properties[property.name] = { number: typeof value === "number" ? value : null };
}
