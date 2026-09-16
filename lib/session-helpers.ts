// lib/session-helpers.ts
// Module 2: helper functions used by API routes / server actions to
// persist quiz progress in real time and fetch reports by shareable slug.

import { prisma } from "@/lib/prisma";

// Called once when a user lands on Q1. sessionId is then stored client-side
// (localStorage) so a refresh can rehydrate instead of restarting.
export async function createQuizSession(userId?: string) {
  return prisma.quizSession.create({
    data: { userId: userId ?? null },
  });
}

// Called after EVERY question is answered — not just at the end.
// Progress is durable after each tap.
export async function saveQuestionProgress(params: {
  sessionId: string;
  questionId: string;
  optionId: string;
  questionIndex: number; // 0-24
  timeSpentMs?: number;
  questionText?: string;
  chosenOption?: string;
  traitDeltas?: any;
}) {
  const {
    sessionId,
    questionId,
    optionId,
    questionIndex,
    timeSpentMs,
    questionText,
    chosenOption,
    traitDeltas,
  } = params;

  return prisma.$transaction([
    prisma.quizResponse.upsert({
      where: { sessionId_questionId: { sessionId, questionId } },
      update: {
        optionId,
        questionIndex,
        timeSpentMs,
        questionText,
        chosenOption,
        traitDeltas: traitDeltas ?? undefined,
      },
      create: {
        sessionId,
        questionId,
        optionId,
        questionIndex,
        timeSpentMs,
        questionText,
        chosenOption,
        traitDeltas: traitDeltas ?? undefined,
      },
    }),
    prisma.quizSession.update({
      where: { id: sessionId },
      data: { currentIndex: questionIndex },
    }),
  ]);
}

// Called on mount of the quiz page to rehydrate an in-progress session.
export async function resumeQuizSession(sessionId: string) {
  return prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { responses: { orderBy: { questionIndex: "asc" } } },
  });
}

export async function markSessionCompleted(sessionId: string) {
  return prisma.quizSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

// Public report lookup — powers unblur.app/report/[reportId]
// Searches by slug or unique ID
export async function getReportBySlug(slugOrId: string) {
  const report = await prisma.generatedReport.findUnique({
    where: { slug: slugOrId },
  });
  if (report) return report;

  return prisma.generatedReport.findUnique({
    where: { id: slugOrId },
  }).catch(() => null);
}
