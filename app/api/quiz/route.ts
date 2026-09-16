// app/api/quiz/route.ts
// Module 1: Gemini API Backend Scoring Engine
// Scores 8 custom trait dimensions across 25 questions and generates report.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { QUESTION_BANK, TraitDeltaMap, TraitKey, scoreSlider } from "@/lib/question-bank";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

interface AnswerPayload {
  questionId: string;
  optionId: string;
}

interface AnalyzeRequestBody {
  sessionId: string;
  answers: AnswerPayload[];
  guestName?: string;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    archetype_name: {
      type: Type.STRING,
      enum: [
        "The Architect",
        "The Catalyst",
        "The Craftsman",
        "The Healer",
        "The Storyteller",
        "The Strategist",
        "The Guardian",
        "The Explorer",
      ],
    },
    archetype_description: { type: Type.STRING },
    trait_scores: {
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
      required: TRAIT_KEYS,
    },
    decision_pressure_map: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pressure_source: { type: Type.STRING },
          intensity: { type: Type.NUMBER },
          coping_pattern: { type: Type.STRING },
        },
        required: ["pressure_source", "intensity", "coping_pattern"],
      },
    },
    top_3_careers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          career_name: { type: Type.STRING },
          fit_reason: { type: Type.STRING },
          salary_projection: {
            type: Type.OBJECT,
            properties: {
              year_1: {
                type: Type.OBJECT,
                properties: { inr: { type: Type.STRING }, usd: { type: Type.STRING } },
                required: ["inr", "usd"],
              },
              year_5: {
                type: Type.OBJECT,
                properties: { inr: { type: Type.STRING }, usd: { type: Type.STRING } },
                required: ["inr", "usd"],
              },
              year_10: {
                type: Type.OBJECT,
                properties: { inr: { type: Type.STRING }, usd: { type: Type.STRING } },
                required: ["inr", "usd"],
              },
            },
            required: ["year_1", "year_5", "year_10"],
          },
        },
        required: ["career_name", "fit_reason", "salary_projection"],
      },
    },
    university_and_scholarship_recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          university: { type: Type.STRING },
          country: { type: Type.STRING },
          program_fit: { type: Type.STRING },
          scholarship_note: { type: Type.STRING },
        },
        required: ["university", "country", "program_fit", "scholarship_note"],
      },
    },
    six_month_action_roadmap: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          month_range: { type: Type.STRING },
          title: { type: Type.STRING },
          action: { type: Type.STRING },
        },
        required: ["month_range", "title", "action"],
      },
    },
    parent_guide_summary: { type: Type.STRING },
  },
  required: [
    "archetype_name",
    "archetype_description",
    "trait_scores",
    "decision_pressure_map",
    "top_3_careers",
    "university_and_scholarship_recommendations",
    "six_month_action_roadmap",
    "parent_guide_summary",
  ],
};

const SYSTEM_PROMPT = `You are Unblur's psychometric scoring engine.
You score a scenario-based career discovery quiz for Indian high-school and
early-college students (ages 15-19) across 5 sections (Instinct, Thinking
Style, Self-Awareness, Pressure & Identity, Vision) using 8 trait dimensions:

- analytical: systems/logic-first thinking
- creative: generative, expressive, meaning-making
- social: oriented toward people and relationships
- curiosity: intrinsic drive to learn for its own sake
- independence: self-directed, resistant to external validation
- authority: deference to institutional/parental structure
- peer: sensitivity to what peers think or do
- risk: comfort with uncertainty and unconventional paths

You receive each answered option's pre-computed trait deltas. Aggregate the deltas per dimension and
normalize each to a 0-100 scale.

Assign exactly one of the 8 core archetypes:
"The Architect", "The Catalyst", "The Craftsman", "The Healer", "The Storyteller", "The Strategist", "The Guardian", "The Explorer".

Produce realistic decision-pressure map, top 3 careers with INR and USD salaries for Year 1, Year 5, Year 10,
university and scholarship recommendations, a concrete 6-month roadmap, and reassuring parent guide summary.
Respond ONLY with JSON matching the provided schema.`;

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequestBody = await req.json();

    if (!body.sessionId || !Array.isArray(body.answers)) {
      return NextResponse.json(
        { error: "Expected sessionId and answers array." },
        { status: 400 }
      );
    }

    const enrichedAnswers = body.answers.map((a) => {
      const question = QUESTION_BANK.find((q) => q.id === a.questionId);
      if (!question) {
        return { questionId: a.questionId, questionText: "unknown", answer: "unknown", traitDeltas: {} as TraitDeltaMap };
      }

      if (question.type === "slider" && question.slider) {
        const sliderValue = Number(a.optionId) || 5;
        const deltas = scoreSlider(sliderValue, question.slider);
        return {
          questionId: a.questionId,
          questionText: question.text,
          answer: `slider value ${sliderValue}/10`,
          traitDeltas: deltas,
        };
      }

      const option = question.options?.find((o) => o.id === a.optionId);
      return {
        questionId: a.questionId,
        questionText: question.text,
        answer: option?.text ?? "unknown",
        traitDeltas: option?.traitDeltas ?? ({} as TraitDeltaMap),
      };
    });

    const userPrompt = `Student answers (${enrichedAnswers.length} total), each with pre-tagged trait deltas:
${JSON.stringify(enrichedAnswers, null, 2)}

Aggregate the trait deltas, normalize to 0-100 scales, and produce the full report.`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.4,
      },
    });

    const jsonText = result.text;
    if (!jsonText) {
      return NextResponse.json({ error: "Empty model response." }, { status: 502 });
    }

    const report = JSON.parse(jsonText);
    const slug = generateSlug();

    // Ensure session exists in Prisma DB to prevent foreign key errors
    try {
      await prisma.quizSession.upsert({
        where: { id: body.sessionId },
        update: { status: "COMPLETED", completedAt: new Date() },
        create: { id: body.sessionId, status: "COMPLETED", completedAt: new Date() },
      });

      const saved = await prisma.generatedReport.create({
        data: {
          sessionId: body.sessionId,
          payload: report,
          slug,
        },
      });

      return NextResponse.json({ reportId: saved.slug, report });
    } catch (dbErr) {
      console.warn("[/api/quiz] DB save warning, returning report with generated slug:", dbErr);
      return NextResponse.json({ reportId: slug, report });
    }
  } catch (err: any) {
    console.error("[/api/quiz] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate report." },
      { status: 500 }
    );
  }
}

function generateSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}
