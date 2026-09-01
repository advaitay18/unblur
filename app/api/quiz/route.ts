import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const modelName = body.model === 'fast' ? 'gemini-2.5-flash' : 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: modelName,
      contents: body.message || 'Generate question',
      config: {
        systemInstruction: body.system,
        maxOutputTokens: body.maxTokens || 400,
        temperature: 0.7,
      },
    });
    return NextResponse.json({ text: response.text || '' });
  } catch (err: any) {
    console.error('[/api/quiz] Error generating quiz content:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'AI generation failed.' }, { status: 500 });
  }
}
