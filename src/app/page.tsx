import { Dashboard } from "@/features/dashboard/dashboard";
import { listItems } from "@/lib/repository";

export default async function HomePage() {
  const collection = await listItems();
  return <Dashboard collection={collection} />;
}
