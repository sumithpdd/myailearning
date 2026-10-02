import { NextResponse } from "next/server";
import { LEARNING_MODEL } from "@/lib/model";

export async function GET() {
  return NextResponse.json(LEARNING_MODEL);
}
