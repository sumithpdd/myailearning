import { archiveNotionPage, createNotionPage, getNotionContext, updateNotionPage } from "@/lib/notion/client";
import { mapNotionPage, toNotionProperties } from "@/lib/notion/mapper";
import type { LearningItem, LearningItemInput } from "@/types/learning";

export async function createNotionItem(input: LearningItemInput): Promise<LearningItem> {
  const context = await getNotionContext();
  const page = await createNotionPage(toNotionProperties(input, context.schema));
  return mapNotionPage(page, context.schema);
}

export async function updateNotionItem(previous: LearningItem, input: LearningItemInput): Promise<LearningItem> {
  const context = await getNotionContext();
  const page = await updateNotionPage(previous.id, toNotionProperties(input, context.schema, previous));
  return mapNotionPage(page, context.schema);
}

export async function archiveNotionItem(id: string): Promise<void> {
  await archiveNotionPage(id);
}
