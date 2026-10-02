import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createItem, listItems } from "@/lib/repository";
import { validateInput } from "@/lib/validation";

export async function GET() {
  const collection = await listItems();
  return NextResponse.json({
    mode: collection.mode,
    readOnly: collection.readOnly,
    warning: collection.warning,
    items: collection.items,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = validateInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const item = await createItem(parsed.value);
    revalidatePath("/", "layout");
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the item." }, { status: 503 });
  }
}
