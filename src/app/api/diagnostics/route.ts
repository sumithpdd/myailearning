import { NextResponse } from "next/server";
import { diagnoseSources } from "@/lib/repository";

export async function GET() {
  const sources = await diagnoseSources();
  return NextResponse.json({
    sources: sources.map((source) => ({
      name: source.name,
      state: source.state,
      databaseId: source.databaseId || null,
      dataSourceId: source.dataSourceId || null,
      schemaLoaded: source.schemaLoaded,
      queryOk: source.queryOk,
      count: source.count,
      relationFound: source.relationFound,
      error: source.error || null,
    })),
  });
}
