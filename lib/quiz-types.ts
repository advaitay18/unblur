// lib/quiz-types.ts
// Shared shapes for the adaptive quiz. Previously TraitKey/AnsweredQuestion
// were declared separately (and slightly differently) inside
// generate-question/route.ts and analyze/route.ts. Centralizing them here
// so the progress route can use the exact same shape without drifting.

export type TraitKey =
  | "analytical"
  | "creative"
  | "social"
  | "curiosity"
  | "independence"
  | "authority"
  | "peer"
  | "risk";

export const TRAIT_KEYS: TraitKey[] = [
  "analytical",
  "creative",
  "social",
  "curiosity",
  "independence",
  "authority",
  "peer",
  "risk",
];

export type TraitDeltaMap = Partial<Record<TraitKey, number>>;

// A single generated question, as returned by /api/generate-question.
export interface GeneratedOption {
  id: string; // "opt1".."opt4" — unique only WITHIN this question, not session-wide
  text: string;
  traitDeltas: TraitDeltaMap;
}

export interface GeneratedQuestion {
  questionText: string;
  contextLine?: string;
  options: GeneratedOption[];
}

// A fully-resolved answer: the question that was asked, plus which option
// the student picked. This is the shape both /api/generate-question
// (as history) and /api/analyze (as the final answer set) actually need —
// and therefore the shape progress-saving must persist, not just an
// optionId/questionIndex pair.
export interface AnsweredQuestion {
  questionText: string;
  chosenOption: string; // full option text, not the opt1/opt2/etc id
  traitDeltas: TraitDeltaMap;
}
