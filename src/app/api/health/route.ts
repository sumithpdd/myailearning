import { NextResponse } from "next/server";
import { credentialsConfigured, listItems } from "@/lib/repository";

export async function GET() {
  const configured = credentialsConfigured();
  const collection = await listItems();
  return NextResponse.json({
    app: "MyAILearning",
    configured,
    mode: collection.mode,
    readOnly: collection.readOnly,
    count: collection.items.length,
    warning: collection.warning || null,
  });
}
