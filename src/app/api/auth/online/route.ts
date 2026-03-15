import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, listOnlineUsers, toPublicUser, touchSessionByToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("clarifybot_session")?.value;
    if (token) {
      await touchSessionByToken(token);
    }

    const authedUser = await getAuthedUser();
    if (!authedUser) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const users = await listOnlineUsers();
    if (users.length === 0) {
      return NextResponse.json({ users: [toPublicUser(authedUser)] }, { status: 200 });
    }

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
