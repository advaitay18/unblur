// app/api/generate-question/route.ts
// Module: Adaptive Question Generator
// Requires: npm install @google/genai
// Env: GEMINI_API_KEY
//
// Given the student's answers so far (possibly empty, for the first
// question), asks Gemini for the next best question: one scenario-based
// prompt with exactly 4 options, each carrying trait weights across
// Unblur's 8 trait dimensions. The client collects these into a running
// history and, once enough questions have been asked, posts the full
// history to /api/quiz for the final report.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type TraitKey =
  | "analytical"
  | "creative"
  | "social"
  | "curiosity"
  | "independence"
  | "authority"
  | "peer"
  | "risk";

const TRAIT_KEYS: TraitKey[] = [
  "analytical",
  "creative",
  "social",
  "curiosity",
  "independence",
  "authority",
  "peer",
  "risk",
];

interface AnsweredQuestion {
  questionText: string;
  chosenOption: string;
  traitDeltas?: Partial<Record<TraitKey, number>>;
}

interface GenerateQuestionRequestBody {
  sessionId: string;
  answeredQuestions: AnsweredQuestion[];
  guestName?: string;
  // Optional label for the current section, purely for UI progress display
  // (e.g. "Thinking Style", "Pressure & Identity"). Not required by Gemini.
  sectionLabel?: string;
}

const MAX_HISTORY = 20;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    questionText: { type: Type.STRING },
    contextLine: { type: Type.STRING }, // short 2-5 word scene-setter, e.g. "Real talk…"
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING }, // "opt1".."opt4"
          text: { type: Type.STRING },
          traitDeltas: {
            type: Type.OBJECT,
            properties: {
              analytical: { type: Type.NUMBER },
              creative: { type: Type.NUMBER },
              social: { type: Type.NUMBER },
              curiosity: { type: Type.NUMBER },
              independence: { type: Type.NUMBER },
              authority: { type: Type.NUMBER },
              peer: { type: Type.NUMBER },
              risk: { type: Type.NUMBER },
            },
          },
        },
        required: ["id", "text", "traitDeltas"],
      },
    },
  },
  required: ["questionText", "options"],
};

const SYSTEM_PROMPT = `You are Unblur's adaptive quiz engine, writing ONE next question at a time
for a scenario-based career discovery quiz aimed at Indian high-school and
early-college students (ages 15-19).

You score 8 trait dimensions:
- analytical: systems/logic-first thinking
- creative: generative, expressive, meaning-making
- social: oriented toward people and relationships
- curiosity: intrinsic drive to learn for its own sake
- independence: self-directed, resistant to external validation
- authority: deference to institutional/parental structure
- peer: sensitivity to what peers think or do
- risk: comfort with uncertainty and unconventional paths

You will be given the student's answers so far (possibly none, if this is
the first question). Write ONE new question that digs into whatever pattern
in their answers is most ambiguous or interesting — or, if this is the first
question, a strong general opener. Ground it in a concrete scenario or
memory, second person, one sentence. Never repeat a question already asked.

Return exactly 4 options. Each option needs a short id ("opt1".."opt4"), a
full-sentence answer text, and a traitDeltas object using only the 8 keys
above with small integers from -2 to 2 (omit keys that don't apply — do not
include zeros). All 4 options must sound like something a capable,
reasonable student might genuinely choose — never make one option obviously
better or more socially desirable than the others, or the question just
measures who's faking a good answer.

Respond ONLY with JSON matching the schema. No prose outside the JSON.`;

export async function POST(req: NextRequest) {
  try {
    const body: GenerateQuestionRequestBody = await req.json();

    if (!body.sessionId || typeof body.sessionId !== "string") {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    const answered = Array.isArray(body.answeredQuestions) ? body.answeredQuestions : [];
    if (answered.length > MAX_HISTORY) {
      return NextResponse.json(
        { error: `Too much history — expected at most ${MAX_HISTORY} prior answers.` },
        { status: 400 }
      );
    }

    const historyText = answered.length
      ? answered
          .map((a, i) => `${i + 1}. Q: "${a.questionText}" — chose: "${a.chosenOption}"`)
          .join("\n")
      : "None yet — this is the first question of the session.";

    const userPrompt = `Student's answers so far:
${historyText}
${body.sectionLabel ? `\nCurrent section focus: ${body.sectionLabel}` : ""}

Write the next question now, following your system instructions exactly.`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.8, // more variety desired here than in the scoring engine
      },
    });

    const jsonText = result.text;
    if (!jsonText) {
      return NextResponse.json({ error: "Empty model response." }, { status: 502 });
    }

    const parsed = JSON.parse(jsonText);

    if (
      !parsed.questionText ||
      !Array.isArray(parsed.options) ||
      parsed.options.length !== 4 ||
      parsed.options.some((o: any) => !o.id || !o.text)
    ) {
      return NextResponse.json({ error: "Malformed question from model." }, { status: 502 });
    }

    // Normalize trait key names defensively (drop anything outside the 8 known keys)
    const clean = {
      questionText: String(parsed.questionText),
      contextLine: parsed.contextLine ? String(parsed.contextLine) : "",
      options: parsed.options.map((o: any) => {
        const deltas: Partial<Record<TraitKey, number>> = {};
        if (o.traitDeltas && typeof o.traitDeltas === "object") {
          for (const k of TRAIT_KEYS) {
            if (typeof o.traitDeltas[k] === "number" && o.traitDeltas[k] !== 0) {
              deltas[k] = o.traitDeltas[k];
            }
          }
        }
        return { id: String(o.id), text: String(o.text), traitDeltas: deltas };
      }),
    };

    return NextResponse.json({ question: clean });
  } catch (err) {
    console.error("[/api/generate-question] error:", err);
    return NextResponse.json({ error: "Failed to generate question." }, { status: 500 });
  }
}
