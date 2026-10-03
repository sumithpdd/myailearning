import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isNoteLabel } from "@/lib/execute";
import { NotionRequestError } from "@/lib/notion/client";
import { appendNote } from "@/lib/repository";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  const record = body as Record<string, unknown>;
  const target = record.target === "task" ? "task" : record.target === "item" ? "item" : "";
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const text = typeof record.text === "string" ? record.text.trim() : "";
  if (!target || !id) return NextResponse.json({ error: "Choose where the note belongs." }, { status: 400 });
  if (!isNoteLabel(label)) return NextResponse.json({ error: "Choose a note type." }, { status: 400 });
  if (!text || text.length > 2000) return NextResponse.json({ error: "Write the note." }, { status: 400 });
  try {
    await appendNote(target, id, `${label}: ${text}`);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the note.";
    const status = error instanceof NotionRequestError && error.status < 500 ? error.status : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
