import Link from "next/link";
import { ProgressBar } from "@/components/ui";
import { formatDateRange, formatDisplayDate } from "@/lib/dates";
import { effectiveProgress, progressIsEstimated } from "@/lib/progress";
import type { LearningItem } from "@/types/learning";

export function LearningCard({ item, hint }: { item: LearningItem; hint?: { remaining: number; nextDue?: string } }) {
  const progress = effectiveProgress(item);
  const subject = item.capability || item.tracks[0];
  return (
    <article className="flex h-full flex-col border-b border-line py-4">
      {subject ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{subject}</p> : null}
      <h2 className="mt-1 text-lg font-semibold leading-6">{item.name}</h2>
      <p className="mt-1 text-sm text-muted">{item.status}</p>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>{progressIsEstimated(item) ? "Estimated" : "Progress"}</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
      <p className="mt-3 text-sm leading-5">
        <span className="text-muted">Next: </span>
        {item.nextAction || "No next action yet."}
      </p>
      {hint ? (
        <p className="mt-1 text-sm text-muted">
          {hint.remaining} open task{hint.remaining === 1 ? "" : "s"}
          {hint.nextDue ? ` · Next ${formatDisplayDate(hint.nextDue)}` : ""}
        </p>
      ) : null}
      <Link href={`/learning/${item.id}`} className="mt-3 inline-flex text-sm font-semibold text-accent">
        Continue
      </Link>
    </article>
  );
}

export function LearningTable({ items }: { items: LearningItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-elev">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-3 font-medium">Name</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Priority</th>
            <th className="px-3 py-3 font-medium">Source</th>
            <th className="px-3 py-3 font-medium">Track</th>
            <th className="px-3 py-3 font-medium">Date</th>
            <th className="px-3 py-3 font-medium">Deadline</th>
            <th className="px-3 py-3 font-medium">Progress</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-line last:border-0">
              <td className="px-3 py-3">
                <Link href={`/learning/${item.id}`} className="font-medium hover:text-accent">
                  {item.name}
                </Link>
                <div className="text-xs text-muted">{item.type}</div>
              </td>
              <td className="px-3 py-3">{item.status}</td>
              <td className="px-3 py-3">{item.priority}</td>
              <td className="px-3 py-3">{item.origin || "—"}</td>
              <td className="px-3 py-3">{item.tracks.join(", ") || "—"}</td>
              <td className="px-3 py-3">{formatDateRange(item.startDate, item.endDate)}</td>
              <td className="px-3 py-3">{formatDisplayDate(item.deadline)}</td>
              <td className="px-3 py-3">{effectiveProgress(item)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
