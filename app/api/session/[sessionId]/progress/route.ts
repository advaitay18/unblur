import { NextRequest, NextResponse } from "next/server";
import { saveQuestionProgress } from "@/lib/session-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;
    const body = await req.json();
    const { questionId, optionId, questionIndex, timeSpentMs, questionText, chosenOption, traitDeltas } = body;

    if (!sessionId || !questionId) {
      return NextResponse.json(
        { error: "Missing required sessionId or questionId." },
        { status: 400 }
      );
    }

    await saveQuestionProgress({
      sessionId,
      questionId,
      optionId: optionId ?? "",
      questionIndex: typeof questionIndex === "number" ? questionIndex : 0,
      timeSpentMs: typeof timeSpentMs === "number" ? timeSpentMs : undefined,
      questionText: typeof questionText === "string" ? questionText : undefined,
      chosenOption: typeof chosenOption === "string" ? chosenOption : undefined,
      traitDeltas,
    });

    return NextResponse.json({ ok: true, success: true });
  } catch (err: any) {
    console.error("[/api/session/[sessionId]/progress] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save progress." },
      { status: 500 }
    );
  }
}
