// app/api/session/[sessionId]/progress/route.ts
// Called after every answered question so a browser refresh mid-quiz never
// loses progress.
//
// FIXED: the previous version stored { questionId, optionId, questionIndex }.
// That's not enough to resume an *adaptive* session: /api/generate-question
// needs each prior answer's full questionText + chosenOption text to build
// its history prompt, and /api/quiz needs those plus traitDeltas to score
// the report. optionId alone ("opt2") is also meaningless across questions,
// since generate-question re-uses opt1..opt4 as labels on every question —
// they're only unique within a single generated question, not session-wide.
//
// So this route now accepts (and stores) the fully-resolved answer: the
// question text, the chosen option's text, and that option's traitDeltas —
// i.e. exactly the AnsweredQuestion shape generate-question/analyze expect.
// That way resuming a session means replaying stored AnsweredQuestion[]
// straight back into those two routes with no lookup step.

import { NextRequest, NextResponse } from "next/server";
import { saveQuestionProgress } from "@/lib/session-helpers";
import { TRAIT_KEYS, type TraitDeltaMap } from "@/lib/quiz-types";

// NOTE on Next.js version: in Next 15+, dynamic route `params` is a Promise
// and must be awaited. This file assumes Next 15+ (`Promise<{ sessionId }>`).
// If you're still on Next 13/14, change the type back to
// `{ params: { sessionId: string } }` and drop the `await`.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await req.json();
    const { questionText, chosenOption, traitDeltas, questionIndex, timeSpentMs } = body;

    if (
      !questionText ||
      typeof questionText !== "string" ||
      !chosenOption ||
      typeof chosenOption !== "string" ||
      typeof questionIndex !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or malformed questionText, chosenOption, or questionIndex." },
        { status: 400 }
      );
    }

    // Defensively re-clean traitDeltas the same way generate-question does,
    // so nothing malformed or out-of-range ends up persisted.
    const cleanDeltas: TraitDeltaMap = {};
    if (traitDeltas && typeof traitDeltas === "object") {
      for (const k of TRAIT_KEYS) {
        if (typeof traitDeltas[k] === "number" && traitDeltas[k] !== 0) {
          cleanDeltas[k] = traitDeltas[k];
        }
      }
    }

    await saveQuestionProgress({
      sessionId,
      questionText,
      chosenOption,
      traitDeltas: cleanDeltas,
      questionIndex,
      timeSpentMs: typeof timeSpentMs === "number" ? timeSpentMs : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/session/[sessionId]/progress] error:", err);
    return NextResponse.json({ error: "Failed to save progress." }, { status: 500 });
  }
}
