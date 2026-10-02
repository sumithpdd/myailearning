export const APP_NAME = "MyAILearning";

export { ITEM_BLOCKERS, ITEM_HORIZONS, ITEM_MOMENTUM, ITEM_ORIGINS, ITEM_PRIORITIES, ITEM_STATUSES, ITEM_TIME_SLOTS, ITEM_TYPES } from "@/types/learning";

export const FINISH_LINE = "2026-12-15";
export const PLAN_START = "2026-09-01";

export const WEEKLY_HOURS_MIN = 4;
export const WEEKLY_HOURS_MAX = 6;
export const WEEKLY_HOURS_TARGET = 5;

export const EXPIRING_WINDOW_DAYS = 21;

export type TrackDefinition = {
  id: string;
  label: string;
  description: string;
  /** Notion option names that should display as this track. */
  aliases: string[];
};

export const TRACKS: TrackDefinition[] = [
  {
    id: "Agents",
    label: "Agents",
    description: "Agentic systems and tool use.",
    aliases: ["Agents"],
  },
  {
    id: "AI Engineering",
    label: "AI Engineering",
    description: "Models, architecture, and production use.",
    aliases: ["AI Engineering"],
  },
  {
    id: "AI Discovery",
    label: "AI Discovery",
    description: "Search, discovery, and citations.",
    aliases: ["AI Discovery", "SEO-AEO-GEO", "SEO", "AEO", "GEO"],
  },
  {
    id: "Data / ML",
    label: "Data / ML",
    description: "Data, modelling, and machine learning.",
    aliases: ["Data / ML", "Data-ML", "Data/ML"],
  },
  {
    id: "Product",
    label: "Product",
    description: "Product strategy and experimentation.",
    aliases: ["Product"],
  },
  {
    id: "Community / Teaching",
    label: "Community / Teaching",
    description: "Workshops, talks, and community events.",
    aliases: ["Community / Teaching", "Community"],
  },
  {
    id: "Cloud",
    label: "Cloud",
    description: "Cloud labs and deployment.",
    aliases: ["Cloud"],
  },
];

export const TRACK_IDS = TRACKS.map((track) => track.id);

export function canonicalTrack(value: string): string {
  return value.trim();
}

export function canonicalTracks(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const track = canonicalTrack(value);
    if (!track || seen.has(track)) continue;
    seen.add(track);
    result.push(track);
  }
  return result;
}

/** Prefer an option the Notion database actually has. */
export function notionTrackName(trackId: string, options: string[] | undefined): string | null {
  const definition = TRACKS.find((track) => track.id === trackId);
  const candidates = definition ? [trackId, ...definition.aliases] : [trackId];
  if (!options || options.length === 0) return candidates[0] ?? null;
  for (const candidate of candidates) {
    const match = options.find((option) => option.toLowerCase() === candidate.toLowerCase());
    if (match) return match;
  }
  return null;
}

export const PRIORITY_WEIGHT: Record<string, number> = {
  Core: 3,
  High: 2,
  Medium: 1,
  Optional: 0.5,
};

export const EVENT_TYPES = new Set(["Event", "Workshop"]);

export function isEventType(type: string): boolean {
  return EVENT_TYPES.has(type);
}

export function isTerminalStatus(status: string): boolean {
  return status === "Completed" || status === "Attended" || status === "Skipped";
}

export function isDoneStatus(status: string): boolean {
  return status === "Completed" || status === "Attended";
}

