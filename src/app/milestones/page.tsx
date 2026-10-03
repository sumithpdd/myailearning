import Link from "next/link";
import { ModeBanner, ProgressBar } from "@/components/ui";
import { formatDisplayDate } from "@/lib/dates";
import { listWork } from "@/lib/repository";

export const metadata = { title: "Milestones" };

export default async function MilestonesPage() {
  const work = await listWork();
  const byCapability = new Map<string, typeof work.milestones>();
  for (const milestone of work.milestones) {
    const key = milestone.capability || "Unassigned";
    byCapability.set(key, [...(byCapability.get(key) || []), milestone]);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <ModeBanner mode={work.mode} warning={work.warning} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Milestones</h1>
        <p className="mt-2 text-sm leading-6 text-muted">What you are trying to achieve. Each milestone points at the learning items that contribute to it.</p>
      </header>
      {work.milestones.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No milestones are visible. Share Learning Milestones with the Notion integration, then relate each one to its learning items.</p>
      ) : null}
      <div className="mt-6 space-y-8">
        {[...byCapability.entries()].map(([capability, milestones]) => (
          <section key={capability}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{capability}</h2>
            <ul className="mt-3 space-y-6">
              {milestones.map((milestone) => {
                const contributing = work.items.filter((item) => milestone.learningItemIds.some((id) => id.replace(/-/g, "") === item.id.replace(/-/g, "")));
                return (
                  <li key={milestone.id} id={milestone.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-semibold">{milestone.name}</h3>
                      <span className="text-sm text-muted">{milestone.target ? formatDisplayDate(milestone.target) : "No target"}</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={milestone.progress || 0} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {[milestone.status, milestone.progress !== undefined ? `${milestone.progress}%` : "Progress not set"].filter(Boolean).join(" · ")}
                    </p>
                    {milestone.successCriteria ? <p className="mt-2 text-sm leading-6">{milestone.successCriteria}</p> : null}
                    {milestone.evidence ? <p className="mt-1 text-sm text-muted">Evidence: {milestone.evidence}</p> : null}
                    {contributing.length === 0 ? <p className="mt-2 text-sm text-muted">No learning item is related yet.</p> : null}
                    <ul className="mt-2">
                      {contributing.map((item) => (
                        <li key={item.id} className="text-sm">
                          <Link href={`/learning/${item.id}`} className="hover:text-accent">
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
