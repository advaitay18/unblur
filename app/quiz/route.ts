// app/api/session/route.ts
// Creates a QuizSession row so downstream QuizResponse/GeneratedReport rows
// have somewhere to attach (both have FKs to QuizSession.id). Called once
// when the quiz page mounts; the returned id is cached in localStorage so a
// refresh resumes instead of creating a new session.
//
// FIXED: GET now returns `answeredQuestions` in the AnsweredQuestion[] shape
// (see lib/quiz-types.ts) — the same shape /api/generate-question expects as
// history and /api/analyze expects as its answers array. Previously GET
// only returned the raw `session` row, which had nowhere to resume *from*:
// the client had no way to rebuild its in-memory answer history after a
// refresh, so mid-quiz progress was tracked but never actually usable.

import { NextResponse } from "next/server";
import {
  createQuizSession,
  resumeQuizSession,
  getAnsweredQuestions,
} from "@/lib/session-helpers";

export async function POST() {
  try {
    const session = await createQuizSession();
    return NextResponse.json({ sessionId: session.id });
  } catch (err) {
    console.error("[/api/session] create error:", err);
    return NextResponse.json({ error: "Failed to create session." }, { status: 500 });
  }
}

// GET /api/session?id=... — rehydrates an in-progress session on refresh.
// Returns both the session row and the resolved answer history so the
// client can immediately resume calling /api/generate-question with a
// non-empty `answeredQuestions` array (or /api/analyze, if the student had
// already reached the end).
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const session = await resumeQuizSession(id);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  const answeredQuestions = await getAnsweredQuestions(id);

  return NextResponse.json({ session, answeredQuestions });
}
