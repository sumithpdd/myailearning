import assert from "node:assert/strict";
import { createSeedItems } from "../src/lib/demo/data";
import { daysUntil } from "../src/lib/dates";
import { deferrals, focusList } from "../src/lib/focus";
import { filterItems } from "../src/lib/filters";
import { embedMeta, readMeta, stripMeta } from "../src/lib/meta";
import { mapNotionPage } from "../src/lib/notion/mapper";
import { mapAgendaPage, mapTaskPage } from "../src/lib/notion/related";
import { nextLearningAction, skillGaps } from "../src/lib/career";
import { nextStep, presentTasks, taskViews, todayAgenda, type LinkedTask } from "../src/lib/execute";
import { isGathering, loadMinutes, nextMove, nextRung, progressStory, sourceGap, taskPhase } from "../src/lib/item-experience";
import type { AgendaEntry, LearningItem, LearningTask } from "../src/types/learning";
import { attentionReasons, suggestHorizon } from "../src/lib/plan";
import { assessPace, progressByTrack, weekLoads } from "../src/lib/progress";
import { TRACKS } from "../src/lib/constants";

const today = new Date(2026, 9, 1);

assert.equal(daysUntil("2026-12-15", today), 75);

const notes = embedMeta("Read the guide", { progress: 55, evidence: ["workshop notes"] });
assert.equal(stripMeta(notes), "Read the guide");
assert.equal(readMeta(notes).progress, 55);
assert.deepEqual(readMeta(notes).evidence, ["workshop notes"]);

const page = {
  object: "page",
  id: "abc",
  url: "https://www.notion.so/abc",
  archived: false,
  created_time: "2026-09-21T12:00:00.000Z",
  last_edited_time: "2026-09-30T12:00:00.000Z",
  properties: {
    Name: { title: [{ plain_text: "Example workshop" }] },
    Status: { select: { name: "Going" } },
    Priority: { select: { name: "High" } },
    Type: { select: { name: "Workshop" } },
    Track: { multi_select: [{ name: "SEO-AEO-GEO" }, { name: "Cloud" }] },
    Capability: { select: { name: "Sample capability" } },
    Skill: { select: { name: "Sample skill" } },
    "Career Progress": { select: { name: "Working" } },
    Notes: { rich_text: [{ plain_text: notes }] },
    Date: { date: { start: "2026-03-04", end: "2026-03-06" } },
    Link: { url: "https://example.com" },
  },
};

const mapped = mapNotionPage(page);
assert.equal(mapped.name, "Example workshop");
assert.equal(mapped.tracks[0], "SEO-AEO-GEO");
assert.equal(mapped.tracks[1], "Cloud");
assert.equal(mapped.notes, "Read the guide");
assert.equal(mapped.progress, 55);
assert.equal(mapped.url, "https://example.com");
assert.equal(mapped.capability, "Sample capability");
assert.equal(mapped.skill, "Sample skill");
assert.equal(mapped.careerProgress, "Working");
const next = nextLearningAction([mapped, ...createSeedItems().filter((item) => item.priority === "Optional")]);
assert.equal(next?.item.capability, "Sample capability");
const gaps = skillGaps([mapped], ["Sample skill", "Missing skill"]);
assert.equal(gaps.find((gap) => gap.skill === "Missing skill")?.reason, "No learning item is attached yet.");
assert.equal(gaps.find((gap) => gap.skill === "Sample skill"), undefined);

const session = mapAgendaPage({
  object: "page",
  id: "session-1",
  properties: {
    Name: { title: [{ plain_text: "Sample session" }] },
    Start: { date: { start: "2026-11-02T09:30:00.000Z" } },
    End: { date: { start: "2026-11-02T10:15:00.000Z" } },
    "Agenda Type": { select: { name: "Session" } },
    Plan: { select: { name: "Attend Live" } },
    Attendance: { select: { name: "Planned" } },
    Priority: { select: { name: "Must" } },
    Track: { multi_select: [{ name: "AI Search" }] },
    Venue: { rich_text: [{ plain_text: "Example hall" }] },
    Speaker: { rich_text: [{ plain_text: "Sample speaker" }] },
    Takeaways: { rich_text: [{ plain_text: "Write the takeaway here" }] },
    "Learning Item": { relation: [{ id: "parent-1" }] },
  },
});
assert.equal(session.name, "Sample session");
assert.equal(session.attendance, "Planned");
assert.equal(session.plan, "Attend Live");
assert.equal(session.venue, "Example hall");
assert.equal(session.learningItemIds[0], "parent-1");
assert.equal(session.start, "2026-11-02T09:30:00.000Z");

const task = mapTaskPage({
  object: "page",
  id: "task-1",
  properties: {
    Name: { title: [{ plain_text: "Sample task" }] },
    Status: { select: { name: "To Do" } },
    "Task Type": { select: { name: "Preparation" } },
    Priority: { select: { name: "Must" } },
    Due: { date: { start: "2026-11-01" } },
    When: { date: { start: "2026-11-01T09:00:00.000Z" } },
    "Duration (min)": { number: 90 },
    "Learning Item": { relation: [{ id: "parent-1" }] },
  },
});
assert.equal(task.name, "Sample task");
assert.equal(task.status, "To Do");
assert.equal(task.taskType, "Preparation");
assert.equal(task.due, "2026-11-01");
assert.equal(task.when, "2026-11-01T09:00:00.000Z");
assert.equal(task.durationMinutes, 90);

const sparse = mapNotionPage({
  object: "page",
  id: "sparse",
  properties: { Name: { title: [{ plain_text: "Only a name" }] } },
});
assert.equal(sparse.status, "To Do");
assert.equal(sparse.priority, "Medium");
assert.deepEqual(sparse.tracks, []);

const items = createSeedItems();
const ids = new Set(items.map((item) => item.id));
assert.equal(ids.size, items.length, "demo ids must be unique");

const core = items.find((item) => item.name === "Sample core course");
assert.equal(suggestHorizon(core!, today), "Now");
assert.ok(attentionReasons(core!, today).includes("Unclear next step"));

const focus = focusList(items, today, 8).map((entry) => entry.item.name);
assert.ok(focus.some((name) => name === "Sample core course"));
assert.equal(focus.some((name) => name === "Sample skipped event"), false);

const deferred = deferrals(items, today, [], 8);
assert.ok(deferred.some((entry) => entry.item.name === "Sample optional reading"));

const busyWeek = weekLoads(items, today, 6).find((week) => week.weekStart === "2026-11-02");
assert.ok(busyWeek?.heavy, "A multi-day event week should be heavy");

const pace = assessPace(items, today);
assert.equal(pace.daysRemaining, 75);
assert.ok(pace.expectedPercent > 20 && pace.expectedPercent < 40);
assert.ok(pace.demandHours > 0);
assert.ok(pace.capacityHours > 0);

const tracks = progressByTrack(items, TRACKS);
assert.ok(tracks.every((track) => track.percent >= 0 && track.percent <= 100));

const searched = filterItems(items, { q: "sample workshop" }, today);
assert.ok(searched.some((item) => item.name === "Sample workshop"));

const hidden = filterItems(items, {}, today);
assert.equal(hidden.some((item) => item.status === "Skipped"), false);

const course = {
  id: "course",
  name: "Sample course",
  type: "Course",
  status: "In Progress",
  priority: "Core",
  tracks: [],
  capability: "Sample capability",
  nextAction: "Continue the next module",
  source: "demo",
} as LearningItem;
const overdueTask: LinkedTask = {
  id: "overdue",
  learningItemIds: [],
  name: "Overdue core task",
  status: "To Do",
  priority: "Core",
  due: "2026-09-01",
  capability: "Sample capability",
};
const datedTask: LinkedTask = {
  id: "dated",
  learningItemIds: [],
  name: "Dated task",
  status: "To Do",
  priority: "High",
  due: "2026-10-03T09:00:00",
};
const doneTask: LinkedTask = { id: "done", learningItemIds: [], name: "Finished task", status: "Done", due: "2026-10-03" };
const looseTask: LinkedTask = { id: "loose", learningItemIds: [], name: "Undated task", status: "To Do", priority: "High" };
const day = todayAgenda([datedTask, doneTask, looseTask], [], new Date(2026, 9, 3));
assert.equal(day.scheduled.length, 2);
assert.equal(day.scheduled[0]?.id, "dated");
assert.equal(day.scheduled[1]?.completed, true);
assert.equal(presentTasks([datedTask])[0]?.durationMinutes, undefined);
assert.equal(nextStep([overdueTask, datedTask], [], [course], new Date(2026, 9, 3))?.id, "overdue");
assert.equal(nextStep([], [], [course], new Date(2026, 9, 3))?.title, "Continue the next module");
assert.equal(taskViews([looseTask, doneTask], new Date(2026, 9, 3)).backlog[0]?.id, "loose");
assert.equal(taskViews([doneTask], new Date(2026, 9, 3)).completed.length, 1);

const sampleEvent = {
  id: "event",
  name: "Sample event",
  type: "Event",
  status: "Going",
  priority: "Core",
  tracks: [],
  careerProgress: "Working",
  startDate: "2026-10-07",
  endDate: "2026-10-09",
  source: "demo",
} as LearningItem;
const morning: AgendaEntry = {
  id: "session",
  learningItemIds: ["event"],
  name: "Morning session",
  start: "2026-10-07T10:00:00",
  end: "2026-10-07T11:00:00",
  attendance: "Planned",
  plan: "Attend Live",
  priority: "Must",
  tracks: [],
};
const booked: LearningTask = { id: "booked", learningItemIds: ["event"], name: "Book ticket", status: "Done", taskType: "Booking", due: "2026-09-01" };
const summary: LearningTask = { id: "summary", learningItemIds: ["event"], name: "Write summary", status: "To Do", taskType: "Follow-up", due: "2026-10-12", durationMinutes: 30 };
assert.equal(isGathering("Conference"), true);
assert.equal(isGathering("Book"), false);
assert.equal(nextMove(sampleEvent, [morning], [summary])?.title, "Morning session");
assert.equal(nextMove(sampleEvent, [], [summary])?.title, "Write summary");
assert.equal(nextMove(sampleEvent, [], []), null);
assert.equal(taskPhase(booked, sampleEvent), "Before");
assert.equal(taskPhase(summary, sampleEvent), "After");
assert.equal(progressStory(sampleEvent, [morning], [booked, summary]).slices.find((slice) => slice.label === "Tasks")?.percent, 50);
assert.equal(nextRung("Working"), "Applied");
assert.equal(nextRung(undefined), null);
assert.equal(nextRung(""), null);
assert.equal(loadMinutes([summary], [morning]).total, 90);
assert.equal(sourceGap({ name: "Learning Agenda", state: "not_connected", schemaLoaded: false, queryOk: false, count: 0, relationFound: false }), "Learning Agenda isn't connected.");
assert.equal(sourceGap({ name: "Learning Tasks", state: "empty", schemaLoaded: true, queryOk: true, count: 0, relationFound: true }), null);

console.log(`verify-domain ok (${items.length} demo items, core pace ${pace.corePercent}%)`);
