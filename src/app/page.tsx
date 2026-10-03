import { Dashboard } from "@/features/dashboard/dashboard";
import { listCatalog, listWork } from "@/lib/repository";

export default async function HomePage() {
  const [work, catalog] = await Promise.all([listWork(), listCatalog()]);
  return (
    <Dashboard
      collection={{ items: work.items, mode: work.mode, readOnly: work.readOnly, warning: work.warning }}
      catalog={catalog}
      tasks={work.tasks}
      agenda={work.agenda}
      warning={work.warning}
    />
  );
}
