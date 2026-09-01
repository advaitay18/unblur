import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing on Vercel' }, { status: 500 });
    }
    const body = await req.json();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    const payload: any = {
      contents: [{ parts: [{ text: body.message || 'Generate question' }] }]
    };
    if (body.system) {
      payload.system_instruction = { parts: [{ text: String(body.system) }] };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[/api/quiz] Google API Error:', data);
      return NextResponse.json({ error: data.error?.message || 'Google API error', raw: data }, { status: 500 });
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'AI generation failed.' }, { status: 500 });
  }
}
