import { ItemForm } from "@/components/learning/item-form";
import { ModeBanner, PageFrame } from "@/components/ui";
import { listCatalog, listItems } from "@/lib/repository";

export const metadata = { title: "New learning item" };

export default async function NewLearningPage() {
  const [collection, catalog] = await Promise.all([listItems(), listCatalog()]);
  return (
    <PageFrame title="New item" lede="This writes to the Notion tracker when credentials are set, and to the local demo store otherwise.">
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <ItemForm readOnly={collection.readOnly} catalog={catalog} />
    </PageFrame>
  );
}
