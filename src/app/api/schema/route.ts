import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { NotionRequestError, getNotionContext, notionConfigured, replacePropertyOptions } from "@/lib/notion/client";
import type { SchemaOption } from "@/lib/notion/schema";

type Body = {
  property?: string;
  op?: string;
  name?: string;
  id?: string;
};

export async function POST(request: Request) {
  if (!notionConfigured()) {
    return NextResponse.json({ error: "Notion is not connected." }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as Body | null;
  const propertyName = body?.property?.trim();
  const op = body?.op;
  const name = body?.name?.trim() || "";
  if (!propertyName || (op !== "add" && op !== "rename" && op !== "remove")) {
    return NextResponse.json({ error: "Choose a property and an action." }, { status: 400 });
  }
  if ((op === "add" || op === "rename") && (!name || name.length > 100)) {
    return NextResponse.json({ error: "Option name must be 1–100 characters." }, { status: 400 });
  }
  try {
    const context = await getNotionContext(true);
    const property = context.schema.properties.find((entry) => entry.name === propertyName);
    if (
      !property?.options ||
      (property.type !== "select" && property.type !== "multi_select" && property.type !== "status")
    ) {
      return NextResponse.json({ error: "That property has no options to edit." }, { status: 400 });
    }
    const options: SchemaOption[] = property.options.map((option) => ({ ...option }));
    if (op === "add") {
      if (options.some((option) => option.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ error: "That option already exists." }, { status: 400 });
      }
      options.push({ name, color: "default" });
    } else if (op === "rename") {
      const option = options.find((entry) => entry.id && entry.id === body?.id);
      if (!option) return NextResponse.json({ error: "That option was not found. Refresh and try again." }, { status: 404 });
      if (options.some((entry) => entry !== option && entry.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ error: "That option already exists." }, { status: 400 });
      }
      option.name = name;
    } else {
      const next = options.filter((entry) => entry.id !== body?.id);
      if (next.length === options.length) {
        return NextResponse.json({ error: "That option was not found. Refresh and try again." }, { status: 404 });
      }
      if (next.length === 0) {
        return NextResponse.json({ error: "Keep at least one option." }, { status: 400 });
      }
      options.length = 0;
      options.push(...next);
    }
    await replacePropertyOptions(propertyName, property.type, options);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof NotionRequestError || error instanceof Error ? error.message : "Could not update Notion.";
    const status = error instanceof NotionRequestError && error.status >= 400 && error.status < 500 ? error.status : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
