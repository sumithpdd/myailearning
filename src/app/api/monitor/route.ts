import { NextResponse } from "next/server";
import { monitorWork } from "@/lib/repository";

export async function GET() {
  const monitor = await monitorWork();
  return NextResponse.json(monitor);
}
