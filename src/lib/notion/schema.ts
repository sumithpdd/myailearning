import {
  ITEM_BLOCKERS,
  ITEM_HORIZONS,
  ITEM_MOMENTUM,
  ITEM_ORIGINS,
  ITEM_PRIORITIES,
  ITEM_STATUSES,
  ITEM_TIME_SLOTS,
  ITEM_TYPES,
} from "@/types/learning";
import { TRACKS } from "@/lib/constants";

export type NotionPropertyKind =
  | "title"
  | "rich_text"
  | "select"
  | "multi_select"
  | "date"
  | "url"
  | "number"
  | "checkbox"
  | "status"
  | "unknown";

export type SchemaOption = {
  id?: string;
  name: string;
  color?: string;
};

export type NotionPropertySchema = {
  name: string;
  type: NotionPropertyKind;
  options?: SchemaOption[];
};

export type NotionSchema = {
  properties: NotionPropertySchema[];
  titleProperty: string;
};

type RawOption = { id?: string; name?: string; color?: string };

type RawProperty = {
  type?: string;
  select?: { options?: RawOption[] };
  multi_select?: { options?: RawOption[] };
  status?: { options?: RawOption[] };
};

const KIND_MAP: Record<string, NotionPropertyKind> = {
  title: "title",
  rich_text: "rich_text",
  text: "rich_text",
  select: "select",
  multi_select: "multi_select",
  date: "date",
  url: "url",
  email: "url",
  number: "number",
  checkbox: "checkbox",
  status: "status",
};

export function parseSchema(properties: Record<string, RawProperty> | undefined): NotionSchema {
  const parsed: NotionPropertySchema[] = [];
  if (properties) {
    for (const [name, value] of Object.entries(properties)) {
      const rawType = value?.type || "unknown";
      const type = KIND_MAP[rawType] ?? "unknown";
      const rawOptions = value?.select?.options || value?.multi_select?.options || value?.status?.options;
      const options = rawOptions
        ?.map((option) => ({ id: option.id, name: option.name || "", color: option.color }))
        .filter((option) => option.name);
      parsed.push({ name, type, options });
    }
  }
  const title = parsed.find((property) => property.type === "title");
  return {
    properties: parsed,
    titleProperty: title?.name || "Name",
  };
}

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "title"],
  type: ["type"],
  status: ["status"],
  priority: ["priority"],
  track: ["track", "tracks"],
  origin: ["source"],
  horizon: ["horizon"],
  momentum: ["momentum"],
  timeSlot: ["time slot", "timeslot"],
  blocker: ["blocker", "blockers"],
  why: ["why"],
  outcome: ["outcome"],
  plannedHours: ["planned hours", "plannedhours"],
  actualHours: ["actual hours", "actualhours"],
  lastLearning: ["last learning", "lastlearning"],
  reviewDate: ["review date", "reviewdate"],
  provider: ["provider"],
  date: ["date", "start", "start date"],
  deadline: ["deadline", "due", "due date"],
  completedDate: ["completed date", "completed", "completion date"],
  updatedDate: ["updated date", "last updated"],
  location: ["location", "venue"],
  link: ["link", "url"],
  email: ["email"],
  notes: ["notes", "note"],
  nextAction: ["next action", "nextaction"],
  offer: ["offer"],
  progress: ["progress"],
  cost: ["cost", "price"],
  evidence: ["evidence"],
};

export function findProperty(schema: NotionSchema, field: keyof typeof FIELD_ALIASES): NotionPropertySchema | undefined {
  const aliases = FIELD_ALIASES[field];
  return schema.properties.find((property) => aliases.includes(property.name.trim().toLowerCase()));
}

export function optionNames(options: SchemaOption[] | undefined): string[] | undefined {
  if (!options) return undefined;
  return options.map((option) => option.name);
}

export function optionOrFallback(value: string, options: SchemaOption[] | undefined, fallbacks: string[]): string | undefined {
  const names = optionNames(options);
  if (!names || names.length === 0) return value;
  const match = names.find((option) => option.toLowerCase() === value.toLowerCase());
  if (match) return match;
  for (const fallback of fallbacks) {
    const found = names.find((option) => option.toLowerCase() === fallback.toLowerCase());
    if (found) return found;
  }
  return undefined;
}

export type Catalog = {
  type: string[];
  status: string[];
  priority: string[];
  origin: string[];
  horizon: string[];
  momentum: string[];
  timeSlot: string[];
  blocker: string[];
  track: string[];
};

export function catalogFromSchema(schema?: NotionSchema): Catalog {
  const pick = (field: keyof typeof FIELD_ALIASES, fallback: readonly string[]) => {
    const names = schema ? optionNames(findProperty(schema, field)?.options)?.filter(Boolean) : undefined;
    return names && names.length > 0 ? names : [...fallback];
  };
  return {
    type: pick("type", ITEM_TYPES),
    status: pick("status", ITEM_STATUSES),
    priority: pick("priority", ITEM_PRIORITIES),
    origin: pick("origin", ITEM_ORIGINS),
    horizon: pick("horizon", ITEM_HORIZONS),
    momentum: pick("momentum", ITEM_MOMENTUM),
    timeSlot: pick("timeSlot", ITEM_TIME_SLOTS),
    blocker: pick("blocker", ITEM_BLOCKERS),
    track: pick("track", TRACKS.map((track) => track.id)),
  };
}

export function choiceProperties(schema: NotionSchema): NotionPropertySchema[] {
  return schema.properties.filter(
    (property) =>
      (property.type === "select" || property.type === "multi_select" || property.type === "status") && property.options,
  );
}
