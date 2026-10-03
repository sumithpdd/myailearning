import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { NotionRequestError } from "@/lib/notion/client";
import { saveTask } from "@/lib/repository";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  const record = body as Record<string, unknown>;
  const patch: { status?: string; notes?: string; due?: string } = {};
  for (const key of ["status", "notes"] as const) {
    if (!(key in record)) continue;
    const value = record[key];
    if (typeof value !== "string" || value.length > 2000) {
      return NextResponse.json({ error: `${key} must be text.` }, { status: 400 });
    }
    patch[key] = value;
  }
  if ("due" in record) {
    const value = record.due;
    if (typeof value !== "string" || value.length > 40 || (value && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)?)?$/.test(value))) {
      return NextResponse.json({ error: "due must be a date." }, { status: 400 });
    }
    patch.due = value;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  try {
    const task = await saveTask(id, patch);
    revalidatePath("/", "layout");
    return NextResponse.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the task.";
    const status = error instanceof NotionRequestError && error.status < 500 ? error.status : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
