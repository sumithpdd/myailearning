import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Demo data is not used. Items come from Notion." }, { status: 410 });
}
