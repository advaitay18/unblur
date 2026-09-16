import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[/api/session] Incoming session request:", body);

    const email = body.email || body.user?.email || null;
    let userId = body.userId || null;

    // Optional user upsert if email is provided
    if (email) {
      const user = await prisma.user.upsert({
        where: { email },
        update: { name: body.name || email.split("@")[0] },
        create: { email, name: body.name || email.split("@")[0] },
      }).catch((err) => {
        console.warn("[/api/session] User upsert fallback:", err);
        return null;
      });
      if (user) userId = user.id;
    }

    // Create real durable QuizSession in PostgreSQL
    const session = await prisma.quizSession.create({
      data: {
        userId: userId ?? null,
      },
    });

    // Also persist auth_session record for token/session tracking
    const token = "tok_" + Math.random().toString(36).substring(2, 15);
    await prisma.authSession.create({
      data: {
        userId: userId ?? null,
        email: email ?? null,
        token,
      },
    }).catch((err) => {
      console.warn("[/api/session] AuthSession create fallback:", err);
    });

    return NextResponse.json({
      success: true,
      authenticated: true,
      sessionId: session.id,
      sessionld: session.id, // compatibility with typo
      userId: userId || "usr_guest",
      user: {
        id: userId || "usr_guest",
        email: email || "user@unblur.in",
        name: email ? email.split("@")[0] : "User",
      },
      token,
      answers: [],
      score: 0,
    });
  } catch (err: any) {
    console.error("[/api/session] Session Error:", err);
    // Fallback gracefully so guest flows can proceed even if DB is temporarily unreachable
    const fallbackId = "sess_" + Math.random().toString(36).substring(2, 9);
    return NextResponse.json({
      success: true,
      sessionId: fallbackId,
      sessionld: fallbackId,
      warning: "Operating in offline/cached session mode",
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || searchParams.get("id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter." }, { status: 400 });
    }

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { responses: { orderBy: { questionIndex: "asc" } } },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error("[/api/session] GET error:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch session." }, { status: 500 });
  }
}
