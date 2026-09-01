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

// Called after EVERY question is answered — not just at the end. This is the
// core fix for "session loss on refresh": progress is durable after each tap.
export async function saveQuestionProgress(params: {
  sessionId: string;
  questionId: string;
  optionId: string;
  questionIndex: number; // 0-24
  timeSpentMs?: number;
}) {
  const { sessionId, questionId, optionId, questionIndex, timeSpentMs } = params;

  await prisma.$transaction([
    prisma.quizResponse.upsert({
      where: { sessionId_questionId: { sessionId, questionId } },
      update: { optionId, timeSpentMs },
      create: { sessionId, questionId, optionId, timeSpentMs },
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
    include: { responses: true },
  });
}

export async function markSessionCompleted(sessionId: string) {
  return prisma.quizSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

// Public report lookup — powers unblur.app/report/[reportId]
export async function getReportBySlug(slug: string) {
  return prisma.generatedReport.findUnique({
    where: { slug },
  });
}
