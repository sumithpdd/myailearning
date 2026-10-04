import Link from "next/link";
import { ModeBanner, PageFrame, ProgressBar } from "@/components/ui";
import { careerPath, hasEvidence, nextLearningAction, skillGaps, unclassifiedItems } from "@/lib/career";
import { nextRung } from "@/lib/item-experience";
import { listCareerGoals } from "@/lib/notion/related";
import { listCatalog, listItems } from "@/lib/repository";

export const metadata = { title: "Career" };

export default async function CareerPage() {
  const [collection, catalog, goals] = await Promise.all([listItems(), listCatalog(), listCareerGoals()]);
  const path = careerPath(collection.items, catalog.capability);
  const gaps = skillGaps(collection.items, catalog.skill);
  const loose = unclassifiedItems(collection.items).slice(0, 8);
  const goal = goals[0];
  const next = nextLearningAction(collection.items);

  return (
    <PageFrame eyebrow="Career path" title={goal?.name || "Career path"} lede={goal?.statement || "What should I learn next, and how does it move the career forward?"}>
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      {next ? (
        <p className="mb-6 text-sm">
          Next on the path:{" "}
          <Link href={`/learning/${next.item.id}`} className="font-semibold hover:text-accent">
            {next.item.nextAction || next.item.name}
          </Link>
          <span className="text-muted"> · {next.reasons.filter((reason) => reason !== next.item.nextAction).slice(0, 3).join(" · ")}</span>
        </p>
      ) : null}
      <div className="space-y-3">
        {path.map((entry) => {
          const supporting = collection.items.filter((item) => item.capability === entry.name && !item.archived);
          const skills = [...new Set(supporting.map((item) => item.skill).filter((skill): skill is string => Boolean(skill)))];
          const evidence = supporting.filter(hasEvidence);
          const open = supporting.find((item) => item.status === "In Progress" || item.status === "Going");
          const skillGapsHere = gaps.filter((gap) => skills.includes(gap.skill));
          return (
            <details key={entry.name} className="rounded-2xl border border-line bg-elev p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold">{entry.name}</h2>
                  <span className="text-sm text-muted">{entry.progress}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={ladderPercent(entry.progress)} />
                </div>
              </summary>
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  Skills: {skills.length > 0 ? skills.join(", ") : "None set on the items in this capability."}
                </p>
                {open ? (
                  <p>
                    Open now:{" "}
                    <Link href={`/learning/${open.id}`} className="font-medium hover:text-accent">
                      {open.nextAction || open.name}
                    </Link>
                    {open.careerProgress ? <span className="text-muted"> · {open.careerProgress}{nextRung(open.careerProgress) ? ` → ${nextRung(open.careerProgress)}` : ""}</span> : null}
                  </p>
                ) : (
                  <p className="text-muted">Nothing in this capability is in progress.</p>
                )}
                <div>
                  <p className="font-medium">Evidence</p>
                  {evidence.length === 0 ? <p className="text-muted">No applied evidence yet. Completing the learning item does not count.</p> : null}
                  <ul className="mt-1 space-y-1">
                    {evidence.map((item) => (
                      <li key={item.id}>
                        <Link href={`/learning/${item.id}`} className="hover:text-accent">
                          {item.name}
                        </Link>
                        <span className="text-muted"> · {[item.skill, item.careerProgress, item.outcome].filter(Boolean).join(" · ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {skillGapsHere.length > 0 ? (
                  <div>
                    <p className="font-medium">Gaps</p>
                    <ul className="mt-1 space-y-1">
                      {skillGapsHere.map((gap) => (
                        <li key={gap.skill}>
                          {gap.skill} <span className="text-muted">· {gap.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
      {path.length === 0 ? <p className="text-sm text-muted">Add capability options in Settings, then set one on each learning item that belongs on the path.</p> : null}
      {loose.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold">Not on the path yet</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {loose.map((item) => (
              <li key={item.id}>
                <Link className="hover:text-accent" href={`/learning/${item.id}/edit`}>
                  {item.name}
                </Link>
                <span className="text-muted"> · {item.priority} · {item.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageFrame>
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
