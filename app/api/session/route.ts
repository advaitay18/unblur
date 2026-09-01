import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log('[/api/session] Incoming Auth Request:', body);

    // Handle typos in incoming field names (sessionId vs sessionld)
    const incomingSessionId = body.sessionId || body.sessionld || body.id;
    const email = body.email || body.user?.email || '';
    const password = body.password || '';
    const sessionId = incomingSessionId || 'sess_' + Math.random().toString(36).substring(2, 9);
    const userId = body.userId || (email ? 'usr_' + Buffer.from(email).toString('hex').substring(0, 10) : 'usr_guest');

    const sessionResponse = {
      success: true,
      authenticated: true,
      sessionId,
      sessionld: sessionId,
      userId,
      user: {
        id: userId,
        email: email || 'user@unblur.in',
        name: email ? email.split('@')[0] : 'User'
      },
      token: 'mock_jwt_token_' + Date.now(),
      answers: body.answers || [],
      score: typeof body.score === 'number' ? body.score : 0
    };

    return NextResponse.json(sessionResponse, { status: 200 });
  } catch (err: any) {
    console.error('[/api/session] Auth Error:', err);
    return NextResponse.json({ error: err?.message || 'Authentication failed' }, { status: 500 });
  }
}
