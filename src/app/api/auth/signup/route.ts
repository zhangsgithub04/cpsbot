import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  createUser,
  findUserByEmail,
  isValidEmail,
  setSessionCookie,
  toPublicUser,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      registrationKey?: string;
    };

    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const registrationKey = (body.registrationKey ?? "").trim();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    if (!process.env.REGISTRATION_SECRETE_KEY) {
      return NextResponse.json({ error: "Server registration key is not configured." }, { status: 500 });
    }

    if (registrationKey !== process.env.REGISTRATION_SECRETE_KEY) {
      return NextResponse.json({ error: "Invalid registration key." }, { status: 403 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const user = await createUser(email, password);
    const token = await createSession(user._id);
    await setSessionCookie(token);

    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
