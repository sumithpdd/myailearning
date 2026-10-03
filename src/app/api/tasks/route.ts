import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { NotionRequestError } from "@/lib/notion/client";
import { addTask, listWork } from "@/lib/repository";

export async function GET() {
  const work = await listWork();
  return NextResponse.json({ choices: work.choices, warning: work.warning, readOnly: work.readOnly });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  const record = body as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name || name.length > 200) return NextResponse.json({ error: "Task needs a title." }, { status: 400 });
  const due = optionalDate(record.due);
  if (due === false) return NextResponse.json({ error: "When must be a date." }, { status: 400 });
  const notes = optionalText(record.notes);
  const priority = optionalText(record.priority, 100);
  const taskType = optionalText(record.taskType, 100);
  const learningItemId = optionalText(record.learningItemId, 80);
  const durationMinutes = optionalMinutes(record.durationMinutes);
  if (notes === false || priority === false || taskType === false || learningItemId === false || durationMinutes === false) {
    return NextResponse.json({ error: "A field is too long." }, { status: 400 });
  }
  try {
    const task = await addTask({
      name,
      due: due || undefined,
      notes: notes || undefined,
      priority: priority || undefined,
      taskType: taskType || undefined,
      learningItemId: learningItemId || undefined,
      durationMinutes: typeof durationMinutes === "number" ? durationMinutes : undefined,
    });
    revalidatePath("/", "layout");
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the task.";
    const status = error instanceof NotionRequestError && error.status < 500 ? error.status : 503;
    return NextResponse.json({ error: message }, { status });
  }
}

function optionalText(value: unknown, max = 2000): string | false | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > max) return false;
  return value.trim();
}

function optionalMinutes(value: unknown): number | false | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const minutes = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) return false;
  return Math.round(minutes);
}

function optionalDate(value: unknown): string | false | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > 40) return false;
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)?)?$/.test(value)) return false;
  return value;
}
