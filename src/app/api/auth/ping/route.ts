import { NextRequest, NextResponse } from "next/server";
import { touchSessionByToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("clarifybot_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    await touchSessionByToken(token);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
