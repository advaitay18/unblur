# Changes needed in lib/session-helpers.ts

I don't have your existing `session-helpers.ts`, so here's what the two
updated routes need from it. Merge these into your real file rather than
replacing it — `createQuizSession` and `resumeQuizSession` presumably
already do Prisma work I can't see.

## 1. `saveQuestionProgress` — new signature

Old signature stored `{ sessionId, questionId, optionId, questionIndex, timeSpentMs }`.
New one needs the fully-resolved answer:

```ts
import { TraitDeltaMap } from "@/lib/quiz-types";

interface SaveProgressInput {
  sessionId: string;
  questionText: string;
  chosenOption: string;
  traitDeltas: TraitDeltaMap;
  questionIndex: number;
  timeSpentMs?: number;
}

export async function saveQuestionProgress(input: SaveProgressInput) {
  return prisma.quizResponse.upsert({
    where: {
      // assumes a @@unique([sessionId, questionIndex]) constraint on
      // QuizResponse — upsert so a re-answered/edited question overwrites
      // its old row instead of duplicating it
      sessionId_questionIndex: {
        sessionId: input.sessionId,
        questionIndex: input.questionIndex,
      },
    },
    update: {
      questionText: input.questionText,
      chosenOption: input.chosenOption,
      traitDeltas: input.traitDeltas, // Json column
      timeSpentMs: input.timeSpentMs,
    },
    create: {
      sessionId: input.sessionId,
      questionIndex: input.questionIndex,
      questionText: input.questionText,
      chosenOption: input.chosenOption,
      traitDeltas: input.traitDeltas,
      timeSpentMs: input.timeSpentMs,
    },
  });
}
```

**Schema implication:** `QuizResponse` needs `questionText: String` and
`chosenOption: String` columns (or you rename existing `questionId`/
`optionId` columns), plus a `traitDeltas: Json` column. If your current
schema only has `questionId`/`optionId` as foreign-key-like fields tied to
a static question bank, this is the part that actually needs a migration —
not just new route code.

## 2. `getAnsweredQuestions` — new function

```ts
import { AnsweredQuestion } from "@/lib/quiz-types";

export async function getAnsweredQuestions(
  sessionId: string
): Promise<AnsweredQuestion[]> {
  const rows = await prisma.quizResponse.findMany({
    where: { sessionId },
    orderBy: { questionIndex: "asc" },
  });

  return rows.map((r) => ({
    questionText: r.questionText,
    chosenOption: r.chosenOption,
    traitDeltas: (r.traitDeltas ?? {}) as AnsweredQuestion["traitDeltas"],
  }));
}
```

This is what `GET /api/session` now calls to return `answeredQuestions` —
in the exact shape `/api/generate-question`'s `answeredQuestions` and
`/api/analyze`'s `answers` already expect, so the client can pass it
straight through on resume with no reshaping.

## 3. Double-check `resumeQuizSession`

Make sure it doesn't already assume/return the old `questionId`/`optionId`
shape anywhere it's used elsewhere in the app (e.g. an admin view or a
progress bar that reads `session.responses`) — anything reading
`QuizResponse.questionId` will break once the schema changes.
