// app/api/session/route.ts
// Creates a QuizSession row so downstream QuizResponse/GeneratedReport rows
// have somewhere to attach (both have FKs to QuizSession.id). Called once
// when the quiz page mounts; the returned id is cached in localStorage so a
// refresh resumes instead of creating a new session.

import { NextResponse } from "next/server";
import { createQuizSession, resumeQuizSession } from "@/lib/session-helpers";

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
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const session = await resumeQuizSession(id);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  return NextResponse.json({ session });
}
