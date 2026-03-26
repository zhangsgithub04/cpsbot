import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { saveClarifySession } from "@/lib/chat-sessions";
import {
  ChatMessage,
  DEVELOP_FINAL_EDIT_PROMPT,
  Provider,
  isValidDevelopFinalEditInput,
  runStageChat,
} from "@/lib/stage-chat";

const INITIAL_DEVELOP_MESSAGE =
  "Please share your statement starting with 'What I see myself doing is...' and include your ideate outputs.";
const DEVELOP_FINAL_EDIT_PROMPT_REGEX = /share any final edits,?\s*or type\s*["']no changes["']\.?/i;

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
          reply: INITIAL_DEVELOP_MESSAGE,
          sessionId: body.sessionId ?? null,
        },
        { status: 200 },
      );
    }

    const latestAssistant = [...normalized].reverse().find((message) => message.role === "assistant")?.content ?? "";
    const latestUser = [...normalized].reverse().find((message) => message.role === "user")?.content ?? "";
    const awaitingFinalEditInput =
      DEVELOP_FINAL_EDIT_PROMPT_REGEX.test(latestAssistant) && !/develop stage complete\./i.test(latestAssistant);

    if (awaitingFinalEditInput && !isValidDevelopFinalEditInput(latestUser)) {
      const reply = DEVELOP_FINAL_EDIT_PROMPT;
      const fullConversation: ChatMessage[] = [...normalized, { role: "assistant", content: reply }];
      const sessionId = await saveClarifySession({
        userId: authedUser._id,
        sessionId: body.sessionId,
        messages: fullConversation,
      });

      return NextResponse.json({ reply, sessionId, provider }, { status: 200 });
    }

    const reply = await runStageChat({ stage: "develop", messages: normalized, provider });
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
