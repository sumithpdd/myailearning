import { Dashboard } from "@/features/dashboard/dashboard";
import { listCatalog, listItems, monitorWork } from "@/lib/repository";

export default async function HomePage() {
  const [collection, catalog, monitor] = await Promise.all([listItems(), listCatalog(), monitorWork()]);
  return <Dashboard collection={collection} tracks={catalog.track} monitor={monitor} />;
}
