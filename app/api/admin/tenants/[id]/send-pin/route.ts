import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "PIN ถูกยกเลิกแล้ว กรุณาใช้ invite link" }, { status: 410 });
}
