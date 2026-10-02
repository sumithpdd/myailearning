export const ITEM_TYPES = ["Event", "Workshop", "Course", "Book", "liveProject", "Video", "Article", "Podcast"] as const;

export const ITEM_ORIGINS = ["AI DevCamp", "Packt", "Manning", "Other"] as const;

export const ITEM_STATUSES = [
  "To Do",
  "Considering",
  "Going",
  "Confirmed",
  "In Progress",
  "Attended",
  "Completed",
  "Skipped",
] as const;

export const ITEM_PRIORITIES = ["Core", "High", "Medium", "Optional"] as const;

export const ITEM_HORIZONS = ["Now", "3 Months", "6 Months", "9 Months", "12 Months", "12+ Months"] as const;

export const ITEM_MOMENTUM = ["On Track", "At Risk", "Stalled", "Backlog"] as const;

export const ITEM_TIME_SLOTS = ["Scheduled", "Needs scheduling", "Ad hoc"] as const;

export const ITEM_BLOCKERS = [
  "No time",
  "Too many priorities",
  "Unclear next step",
  "Too big",
  "Low energy",
  "Lost interest",
  "Waiting",
  "Cost",
  "No deadline",
  "Other",
] as const;

export const SESSION_STATUSES = [
  "Undecided",
  "Attend live",
  "Watch recording",
  "Skipped",
  "Completed",
] as const;

/** Choice values come from the Notion schema. The const lists above are offline fallbacks. */
export type ItemType = string;
export type ItemOrigin = string;
export type ItemStatus = string;
export type ItemPriority = string;
export type ItemHorizon = string;
export type ItemMomentum = string;
export type ItemTimeSlot = string;
export type ItemBlocker = string;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export type ActivityEntry = {
  at: string;
  summary: string;
};

export type SessionProgress = {
  id: string;
  status: SessionStatus;
  notes?: string;
};

/**
 * App-only fields that the current Notion database does not model.
 * They round-trip inside the Notes property. See src/lib/meta.ts.
 */
export type ItemMeta = {
  progress?: number;
  evidence?: string[];
  cost?: number;
  currency?: string;
  statusDetail?: ItemStatus;
  typeDetail?: ItemType;
  sessions?: SessionProgress[];
  checklist?: Record<string, boolean>;
  activity?: ActivityEntry[];
  hoursEstimate?: number;
};

export type LearningItem = {
  id: string;
  name: string;
  type: ItemType;
  status: ItemStatus;
  priority: ItemPriority;
  tracks: string[];
  origin?: ItemOrigin;
  horizon?: ItemHorizon;
  momentum?: ItemMomentum;
  timeSlot?: ItemTimeSlot;
  blockers?: ItemBlocker[];
  why?: string;
  outcome?: string;
  plannedHours?: number;
  actualHours?: number;
  lastLearning?: string;
  reviewDate?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  completedDate?: string;
  updatedDate?: string;
  location?: string;
  url?: string;
  emailUrl?: string;
  notes?: string;
  nextAction?: string;
  offer?: string;
  progress?: number;
  cost?: number;
  currency?: string;
  evidence?: string[];
  notionUrl?: string;
  updatedAt?: string;
  createdAt?: string;
  archived?: boolean;
  hoursEstimate?: number;
  sessions?: SessionProgress[];
  checklist?: Record<string, boolean>;
  activity?: ActivityEntry[];
  source: "notion" | "demo";
};

export type LearningItemInput = {
  name: string;
  type: ItemType;
  status: ItemStatus;
  priority: ItemPriority;
  tracks: string[];
  origin?: ItemOrigin;
  horizon?: ItemHorizon;
  momentum?: ItemMomentum;
  timeSlot?: ItemTimeSlot;
  blockers?: ItemBlocker[];
  why?: string;
  outcome?: string;
  plannedHours?: number;
  actualHours?: number;
  lastLearning?: string;
  reviewDate?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  completedDate?: string;
  updatedDate?: string;
  location?: string;
  url?: string;
  emailUrl?: string;
  notes?: string;
  nextAction?: string;
  offer?: string;
  progress?: number;
  evidence?: string[];
  cost?: number;
  currency?: string;
  hoursEstimate?: number;
  sessions?: SessionProgress[];
  checklist?: Record<string, boolean>;
};

export type DataMode = "notion" | "demo";

export type NotionConnection = {
  status: "live" | "offline" | "missing";
  label: string;
  detail?: string;
};

export type ItemCollection = {
  items: LearningItem[];
  mode: DataMode;
  /** True when Notion is configured but the request failed. Demo rows are read-only. */
  readOnly: boolean;
  warning?: string;
};

/**
 * Future Gmail seam. Candidates are never written to Notion until the user approves.
 */
export type EventCandidate = {
  id: string;
  source: "gmail" | "manual";
  title: string;
  reason: string;
  proposed: LearningItemInput;
};

export type BusyInterval = {
  start: string;
  end: string;
  label: string;
  source: "learning" | "work";
};

export type WeeklyReflection = {
  weekStart: string;
  learned: string[];
  tryNext: string;
  teach: string;
  notes: string;
  updatedAt: string;
};
