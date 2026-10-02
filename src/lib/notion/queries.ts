import { NotionRequestError, getNotionContext, queryNotionPages, retrieveNotionPage } from "@/lib/notion/client";
import { mapNotionPage } from "@/lib/notion/mapper";
import type { LearningItem } from "@/types/learning";

export async function listNotionItems(): Promise<LearningItem[]> {
  const [context, pages] = await Promise.all([getNotionContext(), queryNotionPages()]);
  return pages
    .map((page) => mapNotionPage(page, context.schema))
    .filter((item) => !item.archived);
}

export async function getNotionItem(id: string): Promise<LearningItem | null> {
  const context = await getNotionContext();
  try {
    const page = await retrieveNotionPage(id);
    if (page.archived || page.in_trash) return null;
    return mapNotionPage(page, context.schema);
  } catch (error) {
    if (error instanceof NotionRequestError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}
