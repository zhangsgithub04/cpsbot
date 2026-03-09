import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { saveClarifySession } from "@/lib/chat-sessions";
import { ChatMessage, Provider, runStageChat } from "@/lib/stage-chat";

const INITIAL_IDEATE_MESSAGE =
  "Please type your challenge as a question starting with 'How might I...', 'In what ways might I...', or 'What might be all the ways to...'?";

export async function POST(request: NextRequest) {
  try {
    const authedUser = await getAuthedUser();
    if (!authedUser) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = (await request.json()) as {
      messages?: ChatMessage[];
      sessionId?: string;
      provider?: Provider;
    };
    const provider: Provider = body.provider === "gemini" ? "gemini" : "openai";
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const normalized = messages.filter(
      (message) =>
        message &&
        (message.role === "assistant" || message.role === "user") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    );

    if (normalized.length === 0) {
      return NextResponse.json(
        {
          reply: INITIAL_IDEATE_MESSAGE,
          sessionId: body.sessionId ?? null,
        },
        { status: 200 },
      );
    }

    const reply = await runStageChat({ stage: "ideate", messages: normalized, provider });
    const fullConversation: ChatMessage[] = [...normalized, { role: "assistant", content: reply }];
    const sessionId = await saveClarifySession({
      userId: authedUser._id,
      sessionId: body.sessionId,
      messages: fullConversation,
    });

    return NextResponse.json({ reply, sessionId, provider }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
