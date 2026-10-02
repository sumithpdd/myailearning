import { isDoneStatus, isEventType, isTerminalStatus } from "@/lib/constants";
import { daysUntil } from "@/lib/dates";
import { effectiveProgress } from "@/lib/progress";
import { ITEM_ORIGINS, ITEM_TYPES, type ItemOrigin, type ItemPriority, type ItemStatus, type ItemType, type LearningItem } from "@/types/learning";

export type ItemFilters = {
  q?: string;
  status?: string[];
  priority?: string[];
  type?: string[];
  track?: string[];
  origin?: string;
  shelf?: Shelf;
  provider?: string;
  from?: string;
  to?: string;
  deadlineBefore?: string;
  upcoming?: boolean;
  completed?: boolean;
  expiring?: boolean;
  overdue?: boolean;
  includeSkipped?: boolean;
  evidenceGap?: boolean;
  sort?: SortKey;
};

export type SortKey = "date" | "deadline" | "priority" | "progress" | "name" | "updated";

export type Shelf = "active" | "books" | "videos" | "events" | "completed";

export const SHELVES: { id: Shelf; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "books", label: "Books" },
  { id: "videos", label: "Videos" },
  { id: "events", label: "Events" },
  { id: "completed", label: "Completed" },
];

const PRIORITY_ORDER: Record<string, number> = { Core: 0, High: 1, Medium: 2, Optional: 3 };

export function parseFilters(params: Record<string, string | string[] | undefined>): ItemFilters {
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const list = (key: string) =>
    (read(key) || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  return {
    q: read("q") || undefined,
    status: list("status"),
    priority: list("priority"),
    type: list("type"),
    track: list("track"),
    origin: read("source") || undefined,
    shelf: castShelf(read("shelf")),
    provider: read("provider") || undefined,
    from: read("from") || undefined,
    to: read("to") || undefined,
    deadlineBefore: read("deadline") || undefined,
    upcoming: read("upcoming") === "1",
    completed: read("completed") === "1",
    expiring: read("expiring") === "1",
    overdue: read("overdue") === "1",
    includeSkipped: read("skipped") === "1" || list("status").includes("Skipped"),
    evidenceGap: read("gap") === "1",
    sort: (read("sort") as SortKey) || undefined,
  };
}

export function filtersToQuery(filters: ItemFilters, view?: string): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.priority?.length) params.set("priority", filters.priority.join(","));
  if (filters.type?.length) params.set("type", filters.type.join(","));
  if (filters.track?.length) params.set("track", filters.track.join(","));
  if (filters.origin) params.set("source", filters.origin);
  if (filters.shelf) params.set("shelf", filters.shelf);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.deadlineBefore) params.set("deadline", filters.deadlineBefore);
  if (filters.upcoming) params.set("upcoming", "1");
  if (filters.completed) params.set("completed", "1");
  if (filters.expiring) params.set("expiring", "1");
  if (filters.overdue) params.set("overdue", "1");
  if (filters.includeSkipped) params.set("skipped", "1");
  if (filters.evidenceGap) params.set("gap", "1");
  if (filters.sort) params.set("sort", filters.sort);
  if (view) params.set("view", view);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function filterItems(items: LearningItem[], filters: ItemFilters, now = new Date()): LearningItem[] {
  const query = filters.q?.trim().toLowerCase();
  return items.filter((item) => {
    if (item.archived) return false;
    if (!filters.includeSkipped && item.status === "Skipped" && !filters.status?.includes("Skipped")) return false;
    if (query) {
      const haystack = [item.name, item.notes, item.provider, item.origin, item.location, item.nextAction, item.tracks.join(" "), item.offer]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.status?.length && !filters.status.includes(item.status)) return false;
    if (filters.priority?.length && !filters.priority.includes(item.priority)) return false;
    if (filters.type?.length && !filters.type.includes(item.type)) return false;
    if (filters.track?.length && !item.tracks.some((track) => filters.track?.includes(track))) return false;
    if (filters.origin && item.origin !== filters.origin) return false;
    if (filters.shelf && !matchesShelf(item, filters.shelf)) return false;
    if (filters.provider && item.provider !== filters.provider) return false;
    const marker = item.startDate || item.deadline;
    if (filters.from && (!marker || marker.slice(0, 10) < filters.from)) return false;
    if (filters.to && (!marker || marker.slice(0, 10) > filters.to)) return false;
    if (filters.deadlineBefore && (!item.deadline || item.deadline.slice(0, 10) > filters.deadlineBefore)) return false;
    if (filters.upcoming) {
      const end = (item.endDate || item.startDate || item.deadline || "").slice(0, 10);
      if (!end || end < formatLocal(now) || item.status === "Skipped" || isDoneStatus(item.status)) return false;
    }
    if (filters.completed && item.status !== "Completed") return false;
    if (filters.expiring) {
      if (!item.deadline || isTerminalStatus(item.status)) return false;
      const remaining = daysUntil(item.deadline, now);
      if (remaining < 0 || remaining > 21) return false;
    }
    if (filters.overdue) {
      if (!item.deadline || isTerminalStatus(item.status)) return false;
      if (daysUntil(item.deadline, now) >= 0) return false;
    }
    if (filters.evidenceGap) {
      const important = item.priority === "Core" || item.priority === "High";
      const started = item.status === "In Progress" || isDoneStatus(item.status);
      if (!important || !started || (item.evidence && item.evidence.length > 0)) return false;
    }
    return true;
  });
}

function formatLocal(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sortItems(items: LearningItem[], sort: SortKey = "priority"): LearningItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "date":
        return (a.startDate || "9999-99-99").localeCompare(b.startDate || "9999-99-99") || a.name.localeCompare(b.name);
      case "deadline":
        return (a.deadline || "9999-99-99").localeCompare(b.deadline || "9999-99-99") || a.name.localeCompare(b.name);
      case "priority":
        return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) || (a.deadline || "9999").localeCompare(b.deadline || "9999");
      case "progress":
        return effectiveProgress(b) - effectiveProgress(a) || a.name.localeCompare(b.name);
      case "updated":
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      default:
        return 0;
    }
  });
  return copy;
}

export function relatedItems(items: LearningItem[], current: LearningItem): LearningItem[] {
  return sortItems(
    items.filter(
      (item) =>
        item.id !== current.id &&
        item.status !== "Skipped" &&
        item.tracks.some((track) => current.tracks.includes(track)),
    ),
    "priority",
  ).slice(0, 4);
}

export function providersOf(items: LearningItem[]): string[] {
  return [...new Set(items.map((item) => item.provider).filter((value): value is string => Boolean(value)))].sort();
}

export function isUpcoming(item: LearningItem, now = new Date()): boolean {
  const start = item.startDate || item.deadline;
  if (!start || item.status === "Skipped" || isDoneStatus(item.status)) return false;
  return start.slice(0, 10) >= formatLocal(now);
}

export function castStatus(value: string): ItemStatus | undefined {
  const allowed: ItemStatus[] = ["To Do", "Considering", "Going", "Confirmed", "In Progress", "Attended", "Completed", "Skipped"];
  return allowed.find((status) => status === value);
}

export function castPriority(value: string): ItemPriority | undefined {
  const allowed: ItemPriority[] = ["Core", "High", "Medium", "Optional"];
  return allowed.find((priority) => priority === value);
}

export function castType(value: string): ItemType | undefined {
  return ITEM_TYPES.find((type) => type === value);
}

export function castOrigin(value: string): ItemOrigin | undefined {
  return ITEM_ORIGINS.find((origin) => origin === value);
}

export function castShelf(value: string | undefined): Shelf | undefined {
  return SHELVES.find((shelf) => shelf.id === value)?.id;
}

export function matchesShelf(item: LearningItem, shelf: Shelf): boolean {
  if (shelf === "active") return item.status === "In Progress" || item.status === "Going" || item.status === "Confirmed";
  if (shelf === "books") return item.type === "Book";
  if (shelf === "videos") return item.type === "Video";
  if (shelf === "events") return item.type === "Event" || item.type === "Workshop";
  return item.status === "Completed" || item.status === "Attended";
}

export function eventItems(items: LearningItem[]): LearningItem[] {
  return items.filter((item) => isEventType(item.type));
}
