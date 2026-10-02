import type { ItemMeta } from "@/types/learning";

const META_PATTERN = /<!-- myailearning:([\s\S]*?) -->/g;

function compact(meta: ItemMeta): ItemMeta {
  const next: ItemMeta = {};
  if (typeof meta.progress === "number" && !Number.isNaN(meta.progress)) next.progress = meta.progress;
  if (meta.evidence && meta.evidence.length > 0) next.evidence = meta.evidence.slice(0, 20);
  if (typeof meta.cost === "number") next.cost = meta.cost;
  if (meta.currency) next.currency = meta.currency;
  if (meta.statusDetail) next.statusDetail = meta.statusDetail;
  if (meta.typeDetail) next.typeDetail = meta.typeDetail;
  if (meta.sessions && meta.sessions.length > 0) next.sessions = meta.sessions;
  if (meta.checklist && Object.keys(meta.checklist).length > 0) next.checklist = meta.checklist;
  if (meta.activity && meta.activity.length > 0) next.activity = meta.activity.slice(-12);
  if (typeof meta.hoursEstimate === "number") next.hoursEstimate = meta.hoursEstimate;
  return next;
}

export function readMeta(notes?: string): ItemMeta {
  if (!notes) return {};
  const matches = [...notes.matchAll(META_PATTERN)];
  const last = matches.at(-1);
  if (!last) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(last[1])) as ItemMeta;
    return compact(parsed);
  } catch {
    return {};
  }
}

export function stripMeta(notes?: string): string {
  if (!notes) return "";
  return notes.replace(/\n*<!-- myailearning:[\s\S]*? -->/g, "").trim();
}

export function embedMeta(notes: string | undefined, meta: ItemMeta): string {
  const clean = stripMeta(notes);
  const payload = compact(meta);
  if (Object.keys(payload).length === 0) return clean;
  const encoded = encodeURIComponent(JSON.stringify(payload));
  return `${clean}${clean ? "\n\n" : ""}<!-- myailearning:${encoded} -->`;
}
