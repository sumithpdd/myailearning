import { NextResponse } from "next/server";
import { writeReflection } from "@/lib/demo/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  const record = body as Record<string, unknown>;
  const weekStart = typeof record.weekStart === "string" ? record.weekStart.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return NextResponse.json({ error: "Week is required." }, { status: 400 });
  const learned = Array.isArray(record.learned) ? record.learned.map((entry) => String(entry)) : [];
  const reflection = writeReflection({
    weekStart,
    learned,
    tryNext: typeof record.tryNext === "string" ? record.tryNext : "",
    teach: typeof record.teach === "string" ? record.teach : "",
    notes: typeof record.notes === "string" ? record.notes : "",
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json(reflection);
}
