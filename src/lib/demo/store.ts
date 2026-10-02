import fs from "node:fs";
import path from "node:path";
import { createSeedItems } from "@/lib/demo/data";
import type { LearningItem, LearningItemInput, WeeklyReflection } from "@/types/learning";

const dataDir = path.join(process.cwd(), ".data");
const storePath = path.join(dataDir, "demo-store.json");
const reviewPath = path.join(dataDir, "weekly-reviews.json");

function ensureDir(): void {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function readDemoItems(): LearningItem[] {
  try {
    if (!fs.existsSync(storePath)) return createSeedItems();
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8")) as LearningItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return createSeedItems();
    return parsed;
  } catch {
    return createSeedItems();
  }
}

export function writeDemoItems(items: LearningItem[]): void {
  ensureDir();
  fs.writeFileSync(storePath, JSON.stringify(items, null, 2));
}

export function resetDemoItems(): LearningItem[] {
  const items = createSeedItems();
  writeDemoItems(items);
  return items;
}

export function demoCreate(input: LearningItemInput): LearningItem {
  const items = readDemoItems();
  const item: LearningItem = {
    ...input,
    id: `demo-${crypto.randomUUID()}`,
    source: "demo",
    evidence: input.evidence || [],
    sessions: input.sessions || [],
    checklist: input.checklist || {},
    activity: [{ at: new Date().toISOString(), summary: "Created" }],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  items.unshift(item);
  writeDemoItems(items);
  return item;
}

export function demoUpdate(id: string, input: LearningItemInput, summary: string): LearningItem | null {
  const items = readDemoItems();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const previous = items[index];
  const next: LearningItem = {
    ...previous,
    ...input,
    id,
    source: "demo",
    evidence: input.evidence || [],
    sessions: input.sessions || previous.sessions || [],
    checklist: input.checklist || previous.checklist || {},
    activity: [...(previous.activity || []), { at: new Date().toISOString(), summary }].slice(-12),
    updatedAt: new Date().toISOString(),
  };
  items[index] = next;
  writeDemoItems(items);
  return next;
}

export function demoArchive(id: string): boolean {
  const items = readDemoItems();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return false;
  items[index] = {
    ...items[index],
    archived: true,
    updatedAt: new Date().toISOString(),
    activity: [...(items[index].activity || []), { at: new Date().toISOString(), summary: "Archived" }].slice(-12),
  };
  writeDemoItems(items);
  return true;
}

export function readReflections(): Record<string, WeeklyReflection> {
  try {
    if (!fs.existsSync(reviewPath)) return {};
    return JSON.parse(fs.readFileSync(reviewPath, "utf8")) as Record<string, WeeklyReflection>;
  } catch {
    return {};
  }
}

export function writeReflection(reflection: WeeklyReflection): WeeklyReflection {
  const all = readReflections();
  all[reflection.weekStart] = reflection;
  ensureDir();
  fs.writeFileSync(reviewPath, JSON.stringify(all, null, 2));
  return reflection;
}
