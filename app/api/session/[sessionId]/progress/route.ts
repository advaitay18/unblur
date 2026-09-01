// app/api/session/[sessionId]/progress/route.ts
// Called after every answered question so a browser refresh mid-quiz never
// loses progress — this is what actually fixes the "session loss on
// refresh" problem, not just having a schema for it.

import { NextRequest, NextResponse } from "next/server";
import { saveQuestionProgress } from "@/lib/session-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await req.json();
    const { questionId, optionId, questionIndex, timeSpentMs } = body;

    if (!questionId || optionId === undefined || questionIndex === undefined) {
      return NextResponse.json({ error: "Missing questionId, optionId, or questionIndex." }, { status: 400 });
    }

    await saveQuestionProgress({
      sessionId: params.sessionId,
      questionId,
      optionId: String(optionId),
      questionIndex,
      timeSpentMs,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/session/[sessionId]/progress] error:", err);
    return NextResponse.json({ error: "Failed to save progress." }, { status: 500 });
  }
}
