import { NextResponse } from "next/server";
import { getData, saveData } from "@/lib/db";
import { PeriodData } from "@/lib/types";

export async function GET() {
  try {
    const data = await getData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to read data" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body: PeriodData = await request.json();
    await saveData(body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save data" },
      { status: 500 },
    );
  }
}
