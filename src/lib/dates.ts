export function parseISODate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO(now = new Date()): string {
  return formatISODate(now);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO).getTime();
  const to = parseISODate(toISO).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function daysUntil(targetISO: string, now = new Date()): number {
  return daysBetween(todayISO(now), targetISO.slice(0, 10));
}

export function isWithin(iso: string | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const date = parseISODate(iso);
  return date >= start && date <= end;
}

export function formatDisplayDate(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseISODate(iso));
}

export const EVENT_TIME_ZONE = "Europe/London";

/** Calendar day in Europe/London. Date-only values stay on that day. */
export function londonDateKey(iso?: string): string {
  if (!iso) return "";
  if (!iso.includes("T")) return iso.slice(0, 10);
  const date = eventInstant(iso);
  if (!date) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Instant for an agenda timestamp. Zoned values are absolute. Bare times are London wall time. */
export function eventInstant(iso: string): Date | null {
  if (!iso.includes("T")) return null;
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(iso)) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/);
  if (!match) return null;
  const time = match[2].length === 5 ? `${match[2]}:00` : match[2];
  return londonWallTime(match[1], time);
}

function londonWallTime(date: string, time: string): Date {
  const utc = new Date(`${date}T${time}Z`);
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utc);
  const pick = (type: string) => Number(formatted.find((part) => part.type === type)?.value || 0);
  const londonAsUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), pick("hour") % 24, pick("minute"), pick("second"));
  return new Date(utc.getTime() - (londonAsUtc - utc.getTime()));
}

export function formatClock(iso?: string): string {
  if (!iso || !iso.includes("T")) return "";
  const date = eventInstant(iso);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: EVENT_TIME_ZONE,
  }).format(date);
}

export function calendarUrl(item: { name: string; startDate?: string; endDate?: string; location?: string; url?: string }): string | null {
  if (!item.startDate) return null;
  const start = item.startDate.slice(0, 10).replace(/-/g, "");
  const end = formatISODate(addDays(parseISODate(item.endDate || item.startDate), 1)).replace(/-/g, "");
  const params = new URLSearchParams({ action: "TEMPLATE", text: item.name, dates: `${start}/${end}` });
  if (item.location) params.set("location", item.location);
  if (item.url) params.set("details", item.url);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function formatSessionWhen(start?: string, end?: string): string {
  if (!start) return "Time not set";
  const day = formatDisplayDate(start);
  const startTime = formatClock(start);
  const endTime = formatClock(end);
  if (startTime && endTime) return `${day} · ${startTime}–${endTime}`;
  if (startTime) return `${day} · ${startTime}`;
  return day;
}

export function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return "—";
  if (!start) return formatDisplayDate(end);
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return formatDisplayDate(start);
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  if (sameMonth) {
    const month = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(endDate);
    return `${startDate.getDate()}–${endDate.getDate()} ${month}`;
  }
  return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
}

export function formatWeekLabel(weekStartISO: string): string {
  const start = parseISODate(weekStartISO);
  const end = addDays(start, 6);
  return `${formatDisplayDate(formatISODate(start))} – ${formatDisplayDate(formatISODate(end))}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(year, (month || 1) - 1, 1));
}

export function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

export function mapsSearchUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export function mapsDirectionsUrl(location: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
}
