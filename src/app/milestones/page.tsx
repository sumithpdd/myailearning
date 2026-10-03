import Link from "next/link";
import { ModeBanner, ProgressBar } from "@/components/ui";
import { careerPath } from "@/lib/career";
import { formatDisplayDate } from "@/lib/dates";
import { listCatalog, listItems } from "@/lib/repository";

export const metadata = { title: "Milestones" };

export default async function MilestonesPage() {
  const [collection, catalog] = await Promise.all([listItems(), listCatalog()]);
  const path = careerPath(collection.items, catalog.capability);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Milestones</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          There is no Learning Milestones database yet, so this screen cannot show a target date, a progress percentage you set, or success criteria. What it can show is Career Progress for each capability, and the learning items that feed it.
        </p>
      </header>
      {path.length === 0 ? <p className="mt-6 text-sm text-muted">Add capability options in Settings, then set one on a learning item.</p> : null}
      <div className="mt-6 space-y-8">
        {path.map((entry) => {
          const contributing = collection.items.filter((item) => item.capability === entry.name && item.status !== "Skipped");
          return (
            <section key={entry.name} id={slug(entry.name)}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">{entry.name}</h2>
                <span className="text-sm text-muted">{entry.progress}</span>
              </div>
              <div className="mt-2">
                <ProgressBar value={ladderPercent(entry.progress)} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {entry.open} open · {entry.evidence} with evidence
              </p>
              {contributing.length === 0 ? <p className="mt-3 text-sm text-muted">No learning item is attached yet.</p> : null}
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {contributing.map((item) => (
                  <li key={item.id} className="py-2 text-sm">
                    <Link href={`/learning/${item.id}`} className="font-medium hover:text-accent">
                      {item.name}
                    </Link>
                    <span className="text-muted">
                      {" "}
                      · {item.status}
                      {item.careerProgress ? ` · ${item.careerProgress}` : ""}
                      {item.deadline ? ` · ${formatDisplayDate(item.deadline)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ladderPercent(progress: string): number {
  const key = progress.toLowerCase();
  if (key === "expert") return 100;
  if (key === "applied") return 75;
  if (key === "working") return 50;
  if (key === "beginner") return 25;
  return 0;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
