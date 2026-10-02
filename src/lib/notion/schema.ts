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

export type NotionPropertySchema = {
  name: string;
  type: NotionPropertyKind;
  options?: string[];
};

export type NotionSchema = {
  properties: NotionPropertySchema[];
  titleProperty: string;
};

type RawProperty = {
  type?: string;
  select?: { options?: { name: string }[] };
  multi_select?: { options?: { name: string }[] };
  status?: { options?: { name: string }[] };
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
      const options =
        value?.select?.options?.map((option) => option.name) ||
        value?.multi_select?.options?.map((option) => option.name) ||
        value?.status?.options?.map((option) => option.name);
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

export function optionOrFallback(value: string, options: string[] | undefined, fallbacks: string[]): string | undefined {
  if (!options || options.length === 0) return value;
  const match = options.find((option) => option.toLowerCase() === value.toLowerCase());
  if (match) return match;
  for (const fallback of fallbacks) {
    const found = options.find((option) => option.toLowerCase() === fallback.toLowerCase());
    if (found) return found;
  }
  return undefined;
}
