import type { ItemPriority, ItemStatus, ItemType, LearningItem } from "@/types/learning";

type Seed = {
  name: string;
  type: ItemType;
  status: ItemStatus;
  priority: ItemPriority;
  tracks: string[];
  startDate?: string;
  endDate?: string;
  deadline?: string;
};

function row(seed: Seed): LearningItem {
  return {
    id: seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    source: "demo",
    evidence: [],
    sessions: [],
    checklist: {},
    activity: [],
    ...seed,
  };
}

/** Anonymous fixture for local checks. The live plan is the Notion tracker. */
export function createSeedItems(): LearningItem[] {
  return [
    row({
      name: "Sample core course",
      type: "Course",
      status: "In Progress",
      priority: "Core",
      tracks: ["AI Engineering"],
      deadline: "2026-12-15",
    }),
    row({
      name: "Sample workshop",
      type: "Workshop",
      status: "Going",
      priority: "High",
      tracks: ["Agents"],
      startDate: "2026-11-02",
      endDate: "2026-11-04",
    }),
    row({
      name: "Sample optional reading",
      type: "Book",
      status: "To Do",
      priority: "Optional",
      tracks: ["Data / ML"],
      deadline: "2026-12-01",
    }),
    row({
      name: "Sample skipped event",
      type: "Event",
      status: "Skipped",
      priority: "High",
      tracks: [],
      startDate: "2026-11-02",
      endDate: "2026-11-04",
    }),
  ];
}
