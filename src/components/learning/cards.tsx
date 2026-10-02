import Link from "next/link";
import { Badge, priorityTone, ProgressBar, statusTone } from "@/components/ui";
import { daysUntil, formatDateRange, formatDisplayDate } from "@/lib/dates";
import { effectiveProgress, progressIsEstimated } from "@/lib/progress";
import type { LearningItem } from "@/types/learning";

export function LearningCard({ item }: { item: LearningItem }) {
  const progress = effectiveProgress(item);
  const expiry = expiryLabel(item);
  return (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-elev p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-xl leading-tight">{item.name}</h2>
        <span className="shrink-0 text-xs text-muted">{[item.origin, item.type].filter(Boolean).join(" · ")}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone={statusTone(item.status)}>{item.status}</Badge>
        <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
        {item.tracks.map((track) => (
          <Badge key={track}>{track}</Badge>
        ))}
      </div>
      <dl className="mt-4 space-y-1 text-sm">
        {item.provider && item.provider !== item.origin ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Provider</dt>
            <dd className="text-right">{item.provider}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted">When</dt>
          <dd className="text-right">{item.startDate ? formatDateRange(item.startDate, item.endDate) : formatDisplayDate(item.deadline)}</dd>
        </div>
        {item.location ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Where</dt>
            <dd className="max-w-[14rem] text-right">{item.location}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>{progressIsEstimated(item) ? "Estimated progress" : "Progress"}</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
      {item.nextAction ? (
        <p className="mt-4 text-sm leading-5">
          <span className="text-muted">Next: </span>
          {item.nextAction}
        </p>
      ) : null}
      {expiry ? <p className="mt-3 text-sm font-medium text-warn">{expiry}</p> : null}
      <Link href={`/learning/${item.id}`} className="mt-4 inline-flex text-sm font-semibold text-accent">
        View details
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

function expiryLabel(item: LearningItem): string | null {
  if (!item.deadline || item.status === "Completed" || item.status === "Attended" || item.status === "Skipped") return null;
  const days = daysUntil(item.deadline);
  if (days < 0) return `Overdue by ${Math.abs(days)} days`;
  if (days === 0) return "Deadline today";
  if (days <= 21) return days === 1 ? "Expires tomorrow" : `Expires in ${days} days`;
  return null;
}
