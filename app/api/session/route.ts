import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Auto-generate sessionId if missing from frontend payload
    const sessionId = body.sessionId || body.id || 'session_' + Date.now();

    const sessionData = {
      sessionId,
      answers: body.answers || [],
      score: typeof body.score === 'number' ? body.score : 0,
      timestamp: body.timestamp || new Date().toISOString(),
      ...body
    };

    return NextResponse.json({ success: true, sessionId, data: sessionData });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save session' }, { status: 500 });
  }
}
