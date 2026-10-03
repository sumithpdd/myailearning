import {
  NotionRequestError,
  createNotionPageIn,
  notionConfigured,
  openDataSource,
  openDatabase,
  queryDatabasePages,
  searchDatabases,
  updateNotionPage,
  type NotionPage,
  type OpenedDatabase,
} from "@/lib/notion/client";
import { findProperty, optionNames, optionOrFallback, type NotionSchema } from "@/lib/notion/schema";
import type { AgendaEntry, LearningMilestone, LearningTask, RelatedChoices } from "@/types/learning";

const AGENDA_TITLE = "Learning Agenda";
const TASKS_TITLE = "Learning Tasks";
const MILESTONES_TITLE = "Learning Milestones";

type PropertyBag = Record<string, unknown>;
type RichText = { plain_text?: string };
type SelectValue = { name?: string };

export type RelatedSnapshot = {
  agenda: AgendaEntry[];
  tasks: LearningTask[];
  milestones: LearningMilestone[];
  choices: RelatedChoices;
  warning?: string;
};

const EMPTY_CHOICES: RelatedChoices = {
  attendance: [],
  plan: [],
  agendaPriority: [],
  taskStatus: [],
  taskType: [],
  taskPriority: [],
};

let cached: { at: number; snapshot: RelatedSnapshot } | null = null;

export function clearRelatedCache(): void {
  cached = null;
}

export function samePage(left: string, right: string): boolean {
  return left.replace(/-/g, "").toLowerCase() === right.replace(/-/g, "").toLowerCase();
}

export function mapAgendaPage(page: NotionPage, schema?: NotionSchema): AgendaEntry {
  const resolved = schema || schemaFromPage(page.properties);
  const properties = page.properties;
  return {
    id: page.id,
    learningItemIds: readRelation(properties, findProperty(resolved, "learningItem")?.name || "Learning Item"),
    name: readTitle(properties, findProperty(resolved, "name")?.name || "Name") || "Untitled session",
    agendaType: readSelect(properties, findProperty(resolved, "agendaType")?.name || "Agenda Type") || undefined,
    plan: readSelect(properties, findProperty(resolved, "sessionPlan")?.name || "Plan") || undefined,
    attendance: readSelect(properties, findProperty(resolved, "attendance")?.name || "Attendance") || undefined,
    priority: readSelect(properties, findProperty(resolved, "priority")?.name || "Priority") || undefined,
    tracks: readMulti(properties, findProperty(resolved, "track")?.name || "Track"),
    start: readDate(properties, findProperty(resolved, "start")?.name || "Start"),
    end: readDate(properties, findProperty(resolved, "end")?.name || "End"),
    venue: readRich(properties, findProperty(resolved, "location")?.name || "Venue") || undefined,
    speaker: readRich(properties, findProperty(resolved, "speaker")?.name || "Speaker") || undefined,
    url: readUrl(properties, findProperty(resolved, "link")?.name || "Link"),
    notes: readRich(properties, findProperty(resolved, "notes")?.name || "Notes") || undefined,
    takeaways: readRich(properties, findProperty(resolved, "takeaways")?.name || "Takeaways") || undefined,
    followUp: readRich(properties, findProperty(resolved, "followUp")?.name || "Follow-up") || undefined,
    notionUrl: page.url,
  };
}

export function mapTaskPage(page: NotionPage, schema?: NotionSchema): LearningTask {
  const resolved = schema || schemaFromPage(page.properties);
  const properties = page.properties;
  return {
    id: page.id,
    learningItemIds: readRelation(properties, findProperty(resolved, "learningItem")?.name || "Learning Item"),
    name: readTitle(properties, findProperty(resolved, "name")?.name || "Name") || "Untitled task",
    status: readSelect(properties, findProperty(resolved, "status")?.name || "Status") || undefined,
    taskType: readSelect(properties, findProperty(resolved, "taskType")?.name || "Task Type") || undefined,
    priority: readSelect(properties, findProperty(resolved, "priority")?.name || "Priority") || undefined,
    due: readDate(properties, findProperty(resolved, "due")?.name || "Due"),
    when: readDate(properties, findProperty(resolved, "when")?.name || "When"),
    durationMinutes: readNumber(properties, findProperty(resolved, "duration")?.name || "Duration (min)"),
    url: readUrl(properties, findProperty(resolved, "link")?.name || "Link"),
    notes: readRich(properties, findProperty(resolved, "notes")?.name || "Notes") || undefined,
    notionUrl: page.url,
  };
}

export function mapMilestonePage(page: NotionPage, schema?: NotionSchema): LearningMilestone {
  const resolved = schema || schemaFromPage(page.properties);
  const properties = page.properties;
  return {
    id: page.id,
    name: readTitle(properties, findProperty(resolved, "name")?.name || "Milestone") || "Untitled milestone",
    status: readSelect(properties, findProperty(resolved, "status")?.name || "Status") || undefined,
    target: readDate(properties, findProperty(resolved, "target")?.name || "Target"),
    capability: readSelect(properties, findProperty(resolved, "capability")?.name || "Capability") || undefined,
    progress: readNumber(properties, findProperty(resolved, "progress")?.name || "Progress %"),
    successCriteria: readRich(properties, findProperty(resolved, "successCriteria")?.name || "Success Criteria") || undefined,
    evidence: readRich(properties, findProperty(resolved, "evidence")?.name || "Evidence") || undefined,
    learningItemIds: readRelation(properties, findProperty(resolved, "learningItem")?.name || "Learning Items"),
    notionUrl: page.url,
  };
}

export type CareerGoal = { name: string; statement?: string; status?: string };

export async function listCareerGoals(): Promise<CareerGoal[]> {
  if (!notionConfigured()) return [];
  try {
    const explicit = process.env.NOTION_GOAL_DATA_SOURCE_ID;
    const opened = explicit
      ? await openDataSource(explicit)
      : await (async () => {
          const hits = await searchDatabases("Career Goal");
          const match = hits.find((hit) => hit.title.toLowerCase() === "career goal");
          if (!match) return null;
          const database = await openDatabase(match.id);
          if (database.title && database.title.toLowerCase() !== "career goal") return null;
          return database;
        })();
    if (!opened) return [];
    const pages = await queryDatabasePages(opened);
    return pages.filter(isLive).map((page) => {
      const schema = opened.schema;
      const properties = page.properties;
      return {
        name: readTitle(properties, findProperty(schema, "name")?.name || "Name") || "Career goal",
        statement: readRich(properties, "Statement") || undefined,
        status: readSelect(properties, findProperty(schema, "status")?.name || "Status") || undefined,
      };
    }).filter((goal) => !goal.status || goal.status.toLowerCase() === "active");
  } catch {
    return [];
  }
}

export async function loadRelated(): Promise<RelatedSnapshot> {
  if (!notionConfigured()) return { agenda: [], tasks: [], milestones: [], choices: EMPTY_CHOICES };
  if (cached && Date.now() - cached.at < 60_000) return cached.snapshot;
  const snapshot = await readRelated();
  cached = { at: Date.now(), snapshot };
  return snapshot;
}

export function agendaForItem(snapshot: RelatedSnapshot, itemId: string): AgendaEntry[] {
  return snapshot.agenda
    .filter((entry) => entry.learningItemIds.some((id) => samePage(id, itemId)))
    .sort(byStart);
}

export function tasksForItem(snapshot: RelatedSnapshot, itemId: string): LearningTask[] {
  return snapshot.tasks
    .filter((entry) => entry.learningItemIds.some((id) => samePage(id, itemId)))
    .sort(byDue);
}

export function isOpenTask(task: LearningTask): boolean {
  const status = (task.status || "To Do").toLowerCase();
  return status !== "done" && status !== "skipped" && status !== "completed";
}

export function isOpenSession(entry: AgendaEntry): boolean {
  const attendance = (entry.attendance || "Planned").toLowerCase();
  return !["attended", "watched", "missed", "cancelled"].includes(attendance) && (entry.plan || "").toLowerCase() !== "skip";
}

export async function updateAgendaEntry(
  id: string,
  patch: Partial<Pick<AgendaEntry, "attendance" | "plan" | "notes" | "takeaways" | "followUp">>,
): Promise<AgendaEntry> {
  const opened = await discover("agenda");
  if (!opened) throw new NotionRequestError(404, "Learning Agenda was not found. Share that database with the integration.");
  const properties: Record<string, unknown> = {};
  writeSelect(properties, opened.schema, "attendance", patch.attendance);
  writeSelect(properties, opened.schema, "sessionPlan", patch.plan);
  writeRich(properties, opened.schema, "notes", patch.notes);
  writeRich(properties, opened.schema, "takeaways", patch.takeaways);
  writeRich(properties, opened.schema, "followUp", patch.followUp);
  const page = await updateNotionPage(id, properties);
  clearRelatedCache();
  return mapAgendaPage(page, opened.schema);
}

export async function updateLearningTask(
  id: string,
  patch: Partial<Pick<LearningTask, "status" | "notes" | "due" | "when" | "durationMinutes">>,
): Promise<LearningTask> {
  const opened = await discover("tasks");
  if (!opened) throw new NotionRequestError(404, "Learning Tasks was not found. Share that database with the integration.");
  const properties: Record<string, unknown> = {};
  writeSelect(properties, opened.schema, "status", patch.status);
  writeRich(properties, opened.schema, "notes", patch.notes);
  writeDateField(properties, opened.schema, "due", patch.due);
  writeDateField(properties, opened.schema, "when", patch.when ?? patch.due);
  writeNumber(properties, opened.schema, "duration", patch.durationMinutes);
  const page = await updateNotionPage(id, properties);
  clearRelatedCache();
  return mapTaskPage(page, opened.schema);
}

export async function createLearningTask(input: {
  name: string;
  due?: string;
  when?: string;
  durationMinutes?: number;
  notes?: string;
  learningItemId?: string;
  priority?: string;
  taskType?: string;
}): Promise<LearningTask> {
  const opened = await discover("tasks");
  if (!opened) throw new NotionRequestError(404, "Learning Tasks was not found. Share that database with the integration.");
  const properties: Record<string, unknown> = {};
  writeTitle(properties, opened.schema, input.name);
  writeSelect(properties, opened.schema, "status", "To Do");
  writeSelect(properties, opened.schema, "priority", input.priority);
  writeSelect(properties, opened.schema, "taskType", input.taskType);
  writeRich(properties, opened.schema, "notes", input.notes);
  writeDateField(properties, opened.schema, "due", input.due);
  writeDateField(properties, opened.schema, "when", input.when ?? input.due);
  writeNumber(properties, opened.schema, "duration", input.durationMinutes);
  const relation = findProperty(opened.schema, "learningItem");
  if (input.learningItemId && relation) {
    properties[relation.name] = { relation: [{ id: input.learningItemId }] };
  }
  const page = await createNotionPageIn(opened, properties);
  clearRelatedCache();
  return mapTaskPage(page, opened.schema);
}

async function readRelated(): Promise<RelatedSnapshot> {
  try {
    const [agendaSource, taskSource] = await Promise.all([discover("agenda"), discover("tasks")]);
    const milestoneSource = await discover("milestones").catch(() => null);
    const missing = [agendaSource ? "" : AGENDA_TITLE, taskSource ? "" : TASKS_TITLE, milestoneSource ? "" : MILESTONES_TITLE].filter(Boolean);
    const [agendaPages, taskPages, milestonePages] = await Promise.all([
      agendaSource ? queryDatabasePages(agendaSource) : Promise.resolve([]),
      taskSource ? queryDatabasePages(taskSource) : Promise.resolve([]),
      milestoneSource ? queryDatabasePages(milestoneSource) : Promise.resolve([]),
    ]);
    return {
      agenda: agendaPages.filter(isLive).map((page) => mapAgendaPage(page, agendaSource?.schema)).sort(byStart),
      tasks: taskPages.filter(isLive).map((page) => mapTaskPage(page, taskSource?.schema)).sort(byDue),
      milestones: milestonePages.filter(isLive).map((page) => mapMilestonePage(page, milestoneSource?.schema)).sort(byTarget),
      choices: {
        attendance: names(agendaSource, "attendance"),
        plan: names(agendaSource, "sessionPlan"),
        agendaPriority: names(agendaSource, "priority"),
        taskStatus: names(taskSource, "status"),
        taskType: names(taskSource, "taskType"),
        taskPriority: names(taskSource, "priority"),
      },
      warning: missing.length
        ? `Share ${missing.join(" and ")} with the Notion integration. Those records stay hidden until that connection can read them.`
        : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read agenda or tasks.";
    return { agenda: [], tasks: [], milestones: [], choices: EMPTY_CHOICES, warning: message };
  }
}

async function discover(role: "agenda" | "tasks" | "milestones"): Promise<OpenedDatabase | null> {
  const title = role === "agenda" ? AGENDA_TITLE : role === "tasks" ? TASKS_TITLE : MILESTONES_TITLE;
  const explicit =
    role === "agenda"
      ? process.env.NOTION_AGENDA_DATA_SOURCE_ID
      : role === "tasks"
        ? process.env.NOTION_TASKS_DATA_SOURCE_ID
        : process.env.NOTION_MILESTONES_DATA_SOURCE_ID;
  if (explicit) return openDataSource(explicit);
  const hits = await searchDatabases(title);
  const matches = hits.filter((hit) => hit.title.toLowerCase() === title.toLowerCase());
  const opened: OpenedDatabase[] = [];
  for (const match of matches) {
    const database = await openDatabase(match.id);
    if (database.title && database.title.toLowerCase() !== title.toLowerCase()) continue;
    opened.push(database);
  }
  if (role === "tasks") {
    const related = opened.find((database) => findProperty(database.schema, "learningItem")?.type === "relation");
    if (related) return related;
  }
  return opened[0] || null;
}

function names(opened: OpenedDatabase | null, field: Parameters<typeof findProperty>[1]): string[] {
  if (!opened) return [];
  return optionNames(findProperty(opened.schema, field)?.options) || [];
}

function writeSelect(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: Parameters<typeof findProperty>[1],
  value: string | undefined,
) {
  if (value === undefined) return;
  const property = findProperty(schema, field);
  if (!property || (property.type !== "select" && property.type !== "status" && property.type !== "unknown")) return;
  if (!value) {
    properties[property.name] = { select: null };
    return;
  }
  const written = optionOrFallback(value, property.options, [value]);
  if (!written) throw new NotionRequestError(400, `${value} is not an option on ${property.name}.`);
  properties[property.name] = property.type === "status" ? { status: { name: written } } : { select: { name: written } };
}

function writeTitle(properties: Record<string, unknown>, schema: NotionSchema, value: string) {
  const property = findProperty(schema, "name");
  properties[property?.name || "Name"] = {
    title: [{ type: "text", text: { content: value.trim().slice(0, 200) } }],
  };
}

function writeDateField(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: "due" | "when",
  value: string | undefined,
) {
  if (value === undefined) return;
  const property = findProperty(schema, field);
  if (!property) return;
  properties[property.name] = value ? { date: { start: value } } : { date: null };
}

function writeNumber(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: "duration",
  value: number | undefined,
) {
  if (value === undefined) return;
  const property = findProperty(schema, field);
  if (!property) return;
  properties[property.name] = { number: Number.isFinite(value) ? value : null };
}

function writeRich(
  properties: Record<string, unknown>,
  schema: NotionSchema,
  field: Parameters<typeof findProperty>[1],
  value: string | undefined,
) {
  if (value === undefined) return;
  const property = findProperty(schema, field);
  if (!property) return;
  const text = value.trim().slice(0, 2000);
  properties[property.name] = { rich_text: text ? [{ type: "text", text: { content: text } }] : [] };
}

function byStart(a: AgendaEntry, b: AgendaEntry): number {
  return (a.start || "9999").localeCompare(b.start || "9999") || a.name.localeCompare(b.name);
}

function byTarget(a: LearningMilestone, b: LearningMilestone): number {
  return (a.target || "9999").localeCompare(b.target || "9999") || a.name.localeCompare(b.name);
}

function byDue(a: LearningTask, b: LearningTask): number {
  const openA = isOpenTask(a) ? 0 : 1;
  const openB = isOpenTask(b) ? 0 : 1;
  return openA - openB || (a.due || "9999").localeCompare(b.due || "9999") || a.name.localeCompare(b.name);
}

function isLive(page: NotionPage): boolean {
  return !page.archived && !page.in_trash;
}

function schemaFromPage(properties: PropertyBag): NotionSchema {
  const parsed = Object.keys(properties).map((name) => ({ name, type: "unknown" as const }));
  return { properties: parsed, titleProperty: "Name" };
}

function bag(properties: PropertyBag, name: string): PropertyBag | undefined {
  const direct = properties[name];
  if (direct && typeof direct === "object") return direct as PropertyBag;
  const found = Object.entries(properties).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return found && typeof found[1] === "object" ? (found[1] as PropertyBag) : undefined;
}

function readTitle(properties: PropertyBag, name: string): string {
  const title = bag(properties, name)?.title;
  if (!Array.isArray(title)) return "";
  return title.map((part) => (part as RichText).plain_text || "").join("").trim();
}

function readRich(properties: PropertyBag, name: string): string {
  const rich = bag(properties, name)?.rich_text;
  if (!Array.isArray(rich)) return "";
  return rich.map((part) => (part as RichText).plain_text || "").join("").trim();
}

function readSelect(properties: PropertyBag, name: string): string {
  const property = bag(properties, name);
  const select = (property?.select || property?.status) as SelectValue | undefined;
  return select?.name || "";
}

function readMulti(properties: PropertyBag, name: string): string[] {
  const multi = bag(properties, name)?.multi_select;
  if (!Array.isArray(multi)) return [];
  return multi.map((entry) => (entry as SelectValue).name || "").filter(Boolean);
}

function readNumber(properties: PropertyBag, name: string): number | undefined {
  const value = bag(properties, name)?.number;
  return typeof value === "number" ? value : undefined;
}

function readDate(properties: PropertyBag, name: string): string | undefined {
  const date = bag(properties, name)?.date as { start?: string } | null | undefined;
  return date?.start || undefined;
}

function readUrl(properties: PropertyBag, name: string): string | undefined {
  const url = bag(properties, name)?.url;
  return typeof url === "string" && url ? url : undefined;
}

function readRelation(properties: PropertyBag, name: string): string[] {
  const relation = bag(properties, name)?.relation;
  if (!Array.isArray(relation)) return [];
  return relation.map((entry) => (entry && typeof entry === "object" && "id" in entry && typeof entry.id === "string" ? entry.id : "")).filter(Boolean);
}
