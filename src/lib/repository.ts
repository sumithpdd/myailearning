import { NotionRequestError, getNotionContext, notionConfigured } from "@/lib/notion/client";
import { archiveNotionItem, createNotionItem, updateNotionItem } from "@/lib/notion/mutations";
import { getNotionItem, listNotionItems } from "@/lib/notion/queries";
import type { ItemCollection, LearningItem, LearningItemInput, NotionConnection } from "@/types/learning";

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
      detail: context.databaseTitle || "Events & Learning Tracker",
    };
  } catch (error) {
    return { status: "offline", label: "Notion unreachable", detail: errorMessage(error) };
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
