import { NextRequest, NextResponse } from "next/server";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { getAuthedUser } from "@/lib/auth";
import { deleteClarifySession, getClarifySessionById } from "@/lib/chat-sessions";

function sanitizeFilename(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized.length > 0 ? normalized : "clarify-session";
}

function toRoleLabel(role: "assistant" | "user"): string {
  return role === "user" ? "You" : "Assistant";
}

async function buildSessionDocx(session: {
  title: string;
  topicPrompt: string;
  messages: Array<{ role: "assistant" | "user"; content: string }>;
}): Promise<ArrayBuffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: session.title || "Clarify Session",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Challenge Topic: ", bold: true }),
        new TextRun(session.topicPrompt || "It would be great if I/We..."),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: `Exported on ${new Date().toLocaleString()}`,
      spacing: { after: 320 },
    }),
  ];

  session.messages.forEach((message, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. ${toRoleLabel(message.role)}`, bold: true }),
        ],
        spacing: { after: 80 },
      }),
    );

    const lines = message.content.split(/\r?\n/);
    if (lines.length === 0) {
      children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      return;
    }

    lines.forEach((line) => {
      children.push(
        new Paragraph({
          text: line,
          spacing: { after: 80 },
        }),
      );
    });

    children.push(new Paragraph({ text: "", spacing: { after: 140 } }));
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { id } = await context.params;
    const session = await getClarifySessionById({ userId: user._id, sessionId: id });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const format = request.nextUrl.searchParams.get("format");
    if (format === "docx") {
      const arrayBuffer = await buildSessionDocx(session);
      const filename = `${sanitizeFilename(session.title)}.docx`;

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ session }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await deleteClarifySession({ userId: user._id, sessionId: id });

    if (!deleted) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
