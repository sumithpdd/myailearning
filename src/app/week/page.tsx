import Link from "next/link";
import { ModeBanner, PageFrame } from "@/components/ui";
import { daysLabel, hoursThisWeek, weekItems } from "@/lib/career";
import { WEEKLY_HOURS_MAX, WEEKLY_HOURS_MIN } from "@/lib/constants";
import { listItems } from "@/lib/repository";

export const metadata = { title: "This week" };

export default async function WeekPage() {
  const collection = await listItems();
  const items = weekItems(collection.items, new Date());
  const hours = hoursThisWeek(collection.items, new Date());

  return (
    <PageFrame
      eyebrow="Weekly plan"
      title="This week"
      lede={`About ${WEEKLY_HOURS_MIN}–${WEEKLY_HOURS_MAX} focused hours. ${hours ? `${hours} hours are already planned on these rows.` : "Planned hours are still empty on this week’s rows."}`}
    >
      <ModeBanner mode={collection.mode} warning={collection.warning} />
      {items.length === 0 ? <p className="text-sm text-muted">Nothing dated or in progress this week.</p> : null}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-elev p-4">
            <Link href={`/learning/${item.id}`} className="font-medium hover:text-accent">
              {item.name}
            </Link>
            <p className="mt-1 text-sm text-muted">
              {[daysLabel(item), item.capability, item.skill, item.nextAction, item.plannedHours ? `${item.plannedHours}h` : ""].filter(Boolean).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </PageFrame>
  );
}
