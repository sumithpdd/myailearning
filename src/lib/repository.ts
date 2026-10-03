import { NotionRequestError, getNotionContext, notionConfigured } from "@/lib/notion/client";
import { catalogFromSchema, type Catalog } from "@/lib/notion/schema";
import { archiveNotionItem, createNotionItem, updateNotionItem } from "@/lib/notion/mutations";
import { getNotionItem, listNotionItems } from "@/lib/notion/queries";
import {
  agendaForItem,
  createLearningTask,
  isOpenSession,
  isOpenTask,
  loadRelated,
  samePage,
  tasksForItem,
  updateAgendaEntry,
  updateLearningTask,
} from "@/lib/notion/related";
import type { LinkedSession, LinkedTask } from "@/lib/execute";
import type { AgendaEntry, ItemCollection, LearningItem, LearningItemInput, LearningMilestone, LearningTask, NotionConnection, RelatedChoices } from "@/types/learning";

export function credentialsConfigured(): boolean {
  return notionConfigured();
}

export async function describeConnection(): Promise<NotionConnection> {
  if (!notionConfigured()) {
    return { status: "missing", label: "Not connected", detail: "Notion credentials are missing" };
  }
  try {
    const context = await getNotionContext();
    return {
      status: "live",
      label: "Connected to Notion",
      detail: context.databaseTitle || "Notion database",
    };
  } catch (error) {
    return { status: "offline", label: "Notion unreachable", detail: errorMessage(error) };
  }
}

export async function listCatalog(): Promise<Catalog> {
  if (!notionConfigured()) return catalogFromSchema();
  try {
    const context = await getNotionContext();
    return catalogFromSchema(context.schema);
  } catch {
    return catalogFromSchema();
  }
}

export async function listItems(): Promise<ItemCollection> {
  if (!notionConfigured()) {
    return {
      items: [],
      mode: "demo",
      readOnly: true,
      warning: "Not connected to Notion. Add NOTION_TOKEN and NOTION_DATABASE_ID to .env.local.",
    };
  }
  try {
    const items = await listNotionItems();
    return { items, mode: "notion", readOnly: false };
  } catch (error) {
    return {
      items: [],
      mode: "notion",
      readOnly: true,
      warning: `Notion request failed (${errorMessage(error)}). No demo data is shown.`,
    };
  }
}

export async function relatedForItem(itemId: string): Promise<{
  agenda: AgendaEntry[];
  tasks: LearningTask[];
  choices: RelatedChoices;
  warning?: string;
}> {
  const snapshot = await loadRelated();
  return {
    agenda: agendaForItem(snapshot, itemId),
    tasks: tasksForItem(snapshot, itemId),
    choices: snapshot.choices,
    warning: snapshot.warning,
  };
}

export async function listWork(): Promise<{
  items: LearningItem[];
  agenda: LinkedSession[];
  tasks: LinkedTask[];
  milestones: LearningMilestone[];
  choices: RelatedChoices;
  mode: ItemCollection["mode"];
  readOnly: boolean;
  warning?: string;
}> {
  const [collection, snapshot] = await Promise.all([listItems(), loadRelated()]);
  const parentOf = (ids: string[]) => collection.items.find((item) => ids.some((id) => samePage(id, item.id)));
  const link = (ids: string[]) => {
    const parent = parentOf(ids);
    return { parentId: parent?.id, parentName: parent?.name, capability: parent?.capability };
  };
  return {
    items: collection.items,
    agenda: snapshot.agenda.map((entry) => ({ ...entry, ...link(entry.learningItemIds) })),
    tasks: snapshot.tasks.map((entry) => ({ ...entry, ...link(entry.learningItemIds) })),
    milestones: snapshot.milestones,
    choices: snapshot.choices,
    mode: collection.mode,
    readOnly: collection.readOnly,
    warning: collection.warning || snapshot.warning,
  };
}

export async function monitorWork(): Promise<{
  agenda: (AgendaEntry & { parentId?: string; parentName?: string })[];
  tasks: (LearningTask & { parentId?: string; parentName?: string })[];
  warning?: string;
}> {
  const [collection, snapshot] = await Promise.all([listItems(), loadRelated()]);
  const parentOf = (ids: string[]) => collection.items.find((item) => ids.some((id) => samePage(id, item.id)));
  return {
    agenda: snapshot.agenda.filter(isOpenSession).slice(0, 8).map((entry) => {
      const parent = parentOf(entry.learningItemIds);
      return { ...entry, parentId: parent?.id, parentName: parent?.name };
    }),
    tasks: snapshot.tasks.filter(isOpenTask).slice(0, 8).map((entry) => {
      const parent = parentOf(entry.learningItemIds);
      return { ...entry, parentId: parent?.id, parentName: parent?.name };
    }),
    warning: snapshot.warning,
  };
}

export async function saveAgenda(
  id: string,
  patch: Partial<Pick<AgendaEntry, "attendance" | "plan" | "notes" | "takeaways" | "followUp">>,
): Promise<AgendaEntry> {
  const collection = await listItems();
  assertWritable(collection);
  return updateAgendaEntry(id, patch);
}

export async function saveTask(
  id: string,
  patch: Partial<Pick<LearningTask, "status" | "notes" | "due" | "when" | "durationMinutes">>,
): Promise<LearningTask> {
  const collection = await listItems();
  assertWritable(collection);
  return updateLearningTask(id, patch);
}

export async function addTask(input: {
  name: string;
  due?: string;
  when?: string;
  durationMinutes?: number;
  notes?: string;
  learningItemId?: string;
  priority?: string;
  taskType?: string;
}): Promise<LearningTask> {
  const collection = await listItems();
  assertWritable(collection);
  return createLearningTask(input);
}

export async function appendNote(target: "item" | "task", id: string, text: string): Promise<void> {
  const collection = await listItems();
  assertWritable(collection);
  if (target === "item") {
    const { item } = await getItem(id);
    if (!item) throw new NotionRequestError(404, "Item not found.");
    const notes = [item.notes, text].filter(Boolean).join("\n\n");
    await updateItem(id, { ...toInput(item), notes });
    return;
  }
  const snapshot = await loadRelated();
  const task = snapshot.tasks.find((entry) => samePage(entry.id, id));
  if (!task) throw new NotionRequestError(404, "Task not found.");
  const notes = [task.notes, text].filter(Boolean).join("\n\n");
  await updateLearningTask(id, { notes });
}

export async function getItem(id: string): Promise<{ item: LearningItem | null; collection: ItemCollection }> {
  const collection = await listItems();
  const item = collection.items.find((entry) => entry.id === id) || null;
  if (item || !notionConfigured()) return { item, collection };
  try {
    const live = await getNotionItem(id);
    return { item: live, collection };
  } catch (error) {
    return {
      item: null,
      collection: {
        ...collection,
        warning: collection.warning || errorMessage(error),
      },
    };
  }
}

export async function createItem(input: LearningItemInput): Promise<LearningItem> {
  const collection = await listItems();
  assertWritable(collection);
  return createNotionItem(input);
}

export async function updateItem(id: string, input: LearningItemInput): Promise<LearningItem> {
  const { item, collection } = await getItem(id);
  if (!item) throw new Error("Item not found.");
  assertWritable(collection);
  return updateNotionItem(item, input);
}

export async function archiveItem(id: string): Promise<void> {
  const { item, collection } = await getItem(id);
  if (!item) throw new Error("Item not found.");
  assertWritable(collection);
  await archiveNotionItem(id);
}

export function toInput(item: LearningItem): LearningItemInput {
  return {
    name: item.name,
    type: item.type,
    status: item.status,
    priority: item.priority,
    tracks: item.tracks,
    origin: item.origin,
    horizon: item.horizon,
    momentum: item.momentum,
    timeSlot: item.timeSlot,
    blockers: item.blockers,
    capability: item.capability,
    skill: item.skill,
    careerProgress: item.careerProgress,
    why: item.why,
    outcome: item.outcome,
    plannedHours: item.plannedHours,
    actualHours: item.actualHours,
    lastLearning: item.lastLearning,
    reviewDate: item.reviewDate,
    provider: item.provider,
    startDate: item.startDate,
    endDate: item.endDate,
    deadline: item.deadline,
    completedDate: item.completedDate,
    updatedDate: item.updatedDate,
    location: item.location,
    url: item.url,
    emailUrl: item.emailUrl,
    notes: item.notes,
    nextAction: item.nextAction,
    offer: item.offer,
    progress: item.progress,
    evidence: item.evidence,
    cost: item.cost,
    currency: item.currency,
    hoursEstimate: item.hoursEstimate,
    sessions: item.sessions,
    checklist: item.checklist,
  };
}

function assertWritable(collection: ItemCollection): void {
  if (collection.readOnly) {
    throw new NotionRequestError(503, collection.warning || "Notion is unavailable.");
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
