// app/api/quiz/route.ts
// Module 1: Gemini API Backend Scoring Engine
// Requires: npm install @google/genai
// Env: GEMINI_API_KEY
//
// NOTE: rewritten to match Unblur's actual quiz content (ported from
// unblur_master-2.html), which scores 8 custom trait dimensions
// (analytical, creative, social, curiosity, independence, authority, peer,
// risk) rather than RIASEC/OCEAN. See lib/question-bank.ts.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { QUESTION_BANK, TraitDeltaMap, TraitKey, scoreSlider } from "@/lib/question-bank";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

// ---------- Request contract ----------
// For pair/choice questions, optionId is one of QUESTION_BANK[i].options[].id.
// For slider questions, optionId carries the raw 1-10 value as a string,
// e.g. "7" — the quiz component sends String(sliderValue).
interface AnswerPayload {
  questionId: string;
  optionId: string;
}

interface AnalyzeRequestBody {
  sessionId: string;
  answers: AnswerPayload[]; // expect length === QUESTION_BANK.length
  guestName?: string;
}

// ---------- Gemini structured response schema ----------
// Guarantees typed JSON — no markdown fences, no prose leakage.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    archetype_name: {
      type: Type.STRING,
      enum: [
        "The Architect", // high analytical + independence
        "The Catalyst", // high risk + independence, low authority
        "The Craftsman", // high analytical + authority (structure-seeking builder)
        "The Healer", // high social + low risk
        "The Storyteller", // high creative + curiosity
        "The Strategist", // high analytical + risk
        "The Guardian", // high authority + peer (stability-seeking)
        "The Explorer", // high curiosity + independence, low authority
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

You receive each answered option's pre-computed trait deltas (weighted +1/+2
per relevant dimension, already scored client-side from the fixed option
set — for slider questions you receive a resolved delta based on where the
student landed on a 1-10 scale). Aggregate the deltas per dimension and
normalize each to a 0-100 scale.

From the combined profile, assign exactly one of the 8 core archetypes and
produce a decision-pressure map identifying the psychological pressures
(family expectation, peer comparison, prestige-seeking, fear of instability,
perfectionism, etc.) most likely driving this student's indecision — infer
this primarily from high "authority" and "peer" scores relative to
"independence", each with an intensity score and a coping-pattern
description grounded in cognitive/behavioral psychology.

Recommend exactly 3 careers with realistic INR and USD salary projections for
Year 1, Year 5, and Year 10 appropriate to the Indian and global job market.
Recommend universities (mix of Indian and international) with genuine
scholarship notes — never invent specific figures you are not reasonably
confident about; use qualitative ranges where precision would be fabricated.

Produce a 6-month action roadmap (concrete, sequenced steps — not generic
advice) and a parent_guide_summary written in plain, reassuring language a
non-technical Indian parent can read in under 90 seconds, addressing
financial viability and "what does this even mean" concerns directly.

Respond ONLY with JSON matching the provided schema. No prose outside the JSON.`;

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequestBody = await req.json();

    if (!body.sessionId || !Array.isArray(body.answers) || body.answers.length !== QUESTION_BANK.length) {
      return NextResponse.json(
        { error: `Expected sessionId and exactly ${QUESTION_BANK.length} answers.` },
        { status: 400 }
      );
    }

    // Enrich raw answers with their pre-tagged trait deltas so the model
    // reasons over psychometric weights rather than re-inventing them.
    // Slider answers arrive as a numeric string in optionId and are resolved
    // through the question's threshold config instead of an option lookup.
    const enrichedAnswers = body.answers.map((a) => {
      const question = QUESTION_BANK.find((q) => q.id === a.questionId);
      if (!question) {
        return { questionId: a.questionId, questionText: "unknown", answer: "unknown", traitDeltas: {} as TraitDeltaMap };
      }

      if (question.type === "slider" && question.slider) {
        const sliderValue = Number(a.optionId);
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

    const userPrompt = `Student answers (${QUESTION_BANK.length} total), each with pre-tagged trait deltas:
${JSON.stringify(enrichedAnswers, null, 2)}

Aggregate the trait deltas, normalize to 0-100 scales, and produce the full report
as specified in your system instructions.`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.4, // low temp: this is a scoring engine, not a creative writer
      },
    });

    const jsonText = result.text;
    if (!jsonText) {
      return NextResponse.json({ error: "Empty model response." }, { status: 502 });
    }

    const report = JSON.parse(jsonText);

    // Persist (Module 2) and generate a shareable slug
    const saved = await prisma.generatedReport.create({
      data: {
        sessionId: body.sessionId,
        payload: report,
        slug: generateSlug(),
      },
    });

    return NextResponse.json({ reportId: saved.slug, report });
  } catch (err) {
    console.error("[/api/quiz] error:", err);
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}

function generateSlug(): string {
  // short, url-safe, human-shareable — e.g. unblur.app/report/kx7p2m9q
  return Math.random().toString(36).slice(2, 10);
}
