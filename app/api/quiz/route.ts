import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }
    const body = await req.json();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
    const payload: any = {
      contents: [{ parts: [{ text: body.message || 'Generate question' }] }]
    };
    if (body.system) {
      payload.systemInstruction = { parts: [{ text: String(body.system) }] };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[/api/quiz] Google API error:', JSON.stringify(data));
      return NextResponse.json({ error: data.error?.message || 'Google API error' }, { status: res.status });
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('[/api/quiz] Execution Error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'AI generation failed.' }, { status: 500 });
  }
}
