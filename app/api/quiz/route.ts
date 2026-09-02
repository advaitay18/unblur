import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = body.prompt || body.message || 'Provide a helpful response.';
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ result: text, answer: text }, { status: 200 });
  } catch (err: any) {
    console.error('[/api/quiz] Google API Error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'AI request failed' }, { status: 500 });
  }
}
