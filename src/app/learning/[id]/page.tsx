import { notFound } from "next/navigation";
import { LearningDetail } from "@/components/learning/learning-detail";
import { ModeBanner } from "@/components/ui";
import { getItem, listCatalog, relatedForItem } from "@/lib/repository";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { item } = await getItem(id);
  return { title: item?.name || "Learning item" };
}

export default async function LearningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ item, collection }, catalog] = await Promise.all([getItem(id), listCatalog()]);
  if (!item) notFound();
  const related = await relatedForItem(item.id);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <ModeBanner mode={collection.mode} warning={collection.warning || related.warning} />
      <LearningDetail
        item={item}
        items={collection.items}
        readOnly={collection.readOnly}
        statuses={catalog.status}
        agenda={related.agenda}
        tasks={related.tasks}
        milestones={related.milestones}
        choices={related.choices}
      />
    </div>
  );
}
