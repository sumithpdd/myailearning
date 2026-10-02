import Link from "next/link";
import { notFound } from "next/navigation";
import { LearningDetail } from "@/components/learning/learning-detail";
import { ModeBanner, PageFrame } from "@/components/ui";
import { getItem, listCatalog } from "@/lib/repository";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { item } = await getItem(id);
  return { title: item?.name || "Learning item" };
}

export default async function LearningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ item, collection }, catalog] = await Promise.all([getItem(id), listCatalog()]);
  if (!item) notFound();
  return (
    <PageFrame
      eyebrow={item.type}
      title={item.name}
      lede={item.provider}
      action={
        <Link href={`/learning/${item.id}/edit`} className="rounded-full border border-line px-4 py-2 text-sm">
          Edit
        </Link>
      }
    >
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <LearningDetail item={item} items={collection.items} readOnly={collection.readOnly} statuses={catalog.status} />
    </PageFrame>
  );
}
