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

export function formatClock(iso?: string): string {
  if (!iso || !iso.includes("T")) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
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
