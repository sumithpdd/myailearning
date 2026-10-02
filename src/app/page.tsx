import { Dashboard } from "@/features/dashboard/dashboard";
import { listCatalog, listItems } from "@/lib/repository";

export default async function HomePage() {
  const [collection, catalog] = await Promise.all([listItems(), listCatalog()]);
  return <Dashboard collection={collection} tracks={catalog.track} />;
}
