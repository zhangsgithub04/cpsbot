import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { saveClarifySession } from "@/lib/chat-sessions";
import {
  IDEATE_ADDITIONS_PROMPT,
  ChatMessage,
  IDEATE_FINAL_EDIT_PROMPT,
  Provider,
  isValidIdeateAdditionsInput,
  isValidIdeateFinalEditInput,
  runStageChat,
} from "@/lib/stage-chat";

const INITIAL_IDEATE_MESSAGE =
  "Please type your challenge as a question starting with 'How might I...', 'In what ways might I...', or 'What might be all the ways to...'?";
const IDEATE_ADDITIONS_PROMPT_REGEX = /add 1-3 more ideas,\s*or type\s*["']no addition["']\.?/i;
const IDEATE_HITS_PROMPT_REGEX =
  /pick hit numbers|submit (their )?numbers|reply with (those )?numbers|mark the numbers?.*hits?/i;

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

    const latestAssistant = [...normalized].reverse().find((message) => message.role === "assistant")?.content ?? "";
    const latestUser = [...normalized].reverse().find((message) => message.role === "user")?.content ?? "";
    const awaitingAdditionsInput =
      IDEATE_ADDITIONS_PROMPT_REGEX.test(latestAssistant) && !IDEATE_HITS_PROMPT_REGEX.test(latestAssistant);
    const awaitingFinalEditInput =
      latestAssistant.includes(IDEATE_FINAL_EDIT_PROMPT) && !/ideate stage complete\./i.test(latestAssistant);

    if (awaitingAdditionsInput && !isValidIdeateAdditionsInput(latestUser)) {
      const reply = IDEATE_ADDITIONS_PROMPT;
      const fullConversation: ChatMessage[] = [...normalized, { role: "assistant", content: reply }];
      const sessionId = await saveClarifySession({
        userId: authedUser._id,
        sessionId: body.sessionId,
        messages: fullConversation,
      });

      return NextResponse.json({ reply, sessionId, provider }, { status: 200 });
    }

    if (awaitingFinalEditInput && !isValidIdeateFinalEditInput(latestUser)) {
      const reply = IDEATE_FINAL_EDIT_PROMPT;
      const fullConversation: ChatMessage[] = [...normalized, { role: "assistant", content: reply }];
      const sessionId = await saveClarifySession({
        userId: authedUser._id,
        sessionId: body.sessionId,
        messages: fullConversation,
      });

      return NextResponse.json({ reply, sessionId, provider }, { status: 200 });
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
