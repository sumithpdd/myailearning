import Link from "next/link";
import { PageFrame, ModeBanner } from "@/components/ui";
import { careerPath, evidenceItems, skillGaps, unclassifiedItems } from "@/lib/career";
import { listCareerGoals } from "@/lib/notion/related";
import { listCatalog, listItems } from "@/lib/repository";

export const metadata = { title: "Career" };

export default async function CareerPage() {
  const [collection, catalog, goals] = await Promise.all([listItems(), listCatalog(), listCareerGoals()]);
  const path = careerPath(collection.items, catalog.capability);
  const gaps = skillGaps(collection.items, catalog.skill);
  const evidence = evidenceItems(collection.items);
  const loose = unclassifiedItems(collection.items).slice(0, 8);
  const goal = goals[0];

  return (
    <PageFrame
      eyebrow="Career path"
      title={goal?.name || "Career path"}
      lede={goal?.statement || "What should I learn next, and how does it move the career forward?"}
    >
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      <section className="grid gap-3 md:grid-cols-2">
        {path.map((entry) => (
          <article key={entry.name} className="rounded-2xl border border-line bg-elev p-4">
            <h2 className="font-serif text-2xl">{entry.name}</h2>
            <p className="mt-2 text-sm text-muted">
              {entry.progress} · {entry.open} open · {entry.evidence} with evidence
            </p>
          </article>
        ))}
      </section>
      {path.length === 0 ? <p className="text-sm text-muted">Add capability options in Settings, then set one on each learning item that belongs on the path.</p> : null}

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Skills gap</h2>
        {gaps.length === 0 ? <p className="mt-2 text-sm text-muted">Every skill on the plan has applied evidence, or no skills are defined yet.</p> : null}
        <ul className="mt-3 space-y-2 text-sm">
          {gaps.map((gap) => (
            <li key={gap.skill}>
              <span className="font-medium">{gap.skill}</span>
              <span className="text-muted"> · {gap.reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Evidence</h2>
        <p className="mt-2 text-sm text-muted">Applied or Expert progress, a written outcome, or recorded evidence. A finished course on its own does not count.</p>
        {evidence.length === 0 ? <p className="mt-2 text-sm text-muted">No evidence yet.</p> : null}
        <ul className="mt-3 space-y-2 text-sm">
          {evidence.map((item) => (
            <li key={item.id}>
              <Link className="font-medium hover:text-accent" href={`/learning/${item.id}`}>
                {item.name}
              </Link>
              <span className="text-muted">
                {" "}
                · {[item.capability, item.skill, item.careerProgress, item.outcome].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {loose.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">Not on the path yet</h2>
          <p className="mt-2 text-sm text-muted">Core, high, or in-progress items with no capability. Set one, or leave them off the path.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {loose.map((item) => (
              <li key={item.id}>
                <Link className="font-medium hover:text-accent" href={`/learning/${item.id}/edit`}>
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
