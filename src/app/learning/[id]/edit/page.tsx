import { notFound } from "next/navigation";
import { ItemForm } from "@/components/learning/item-form";
import { ModeBanner, PageFrame } from "@/components/ui";
import { getItem } from "@/lib/repository";

export const metadata = { title: "Edit" };

export default async function EditLearningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { item, collection } = await getItem(id);
  if (!item) notFound();
  return (
    <PageFrame title={`Edit ${item.name}`} lede="Status, priority, progress, dates, notes, links, tracks, and evidence.">
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <ItemForm item={item} readOnly={collection.readOnly} />
    </PageFrame>
  );
}
