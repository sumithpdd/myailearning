import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { archiveItem, getItem, relatedForItem, toInput, updateItem } from "@/lib/repository";
import { validateInput } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const { item, collection } = await getItem(id);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const related = await relatedForItem(item.id);
  return NextResponse.json({
    item,
    agenda: related.agenda,
    tasks: related.tasks,
    mode: collection.mode,
    readOnly: collection.readOnly,
    warning: collection.warning || related.warning,
  });
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const { item } = await getItem(id);
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const patch = await request.json().catch(() => null);
  if (!patch || typeof patch !== "object") return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  const parsed = validateInput({ ...toInput(item), ...patch });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const updated = await updateItem(id, parsed.value);
    revalidatePath("/", "layout");
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the item.";
    const status = message === "Item not found." ? 404 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  try {
    await archiveItem(id);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not archive the item.";
    const status = message === "Item not found." ? 404 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
