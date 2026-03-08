import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, deleteSessionByToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("clarifybot_session")?.value;
    if (token) {
      await deleteSessionByToken(token);
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
