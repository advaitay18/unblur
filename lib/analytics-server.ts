// lib/analytics-server.ts
// Module 4: server utility for events fired from API routes (e.g. pdf_downloaded
// from the streaming route), plus a drop-off aggregation helper for retention
// optimization. Uses PostHog's Node client for server-side capture and Prisma
// for the funnel math (based on QuizResponse rows, which is source-of-truth
// and cheaper than querying PostHog's API for this).

import { PostHog } from "posthog-node";
import { prisma } from "@/lib/prisma";

const client = new PostHog(process.env.POSTHOG_SERVER_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

export async function trackServerEvent(
  event: string,
  properties: Record<string, unknown>,
  distinctId = "server"
) {
  client.capture({ distinctId, event, properties });
  await client.flush();
}

// Returns, for each of the 25 questions, what % of sessions that reached
// that question did NOT continue to the next one. This is the number that
// tells you exactly where the funnel is leaking — e.g. "62% of drop-off
// happens at Q14" means Q14 needs a UX rewrite, not the whole quiz.
export interface QuestionDropOff {
  questionIndex: number;
  reachedCount: number;
  continuedCount: number;
  dropOffPercent: number;
}

export async function computeDropOffByQuestion(totalQuestions = 25): Promise<QuestionDropOff[]> {
  const results: QuestionDropOff[] = [];

  for (let i = 0; i < totalQuestions; i++) {
    const reachedCount = await prisma.quizSession.count({
      where: { currentIndex: { gte: i } },
    });
    const continuedCount = await prisma.quizSession.count({
      where: { currentIndex: { gte: i + 1 } },
    });

    const dropOffPercent = reachedCount === 0 ? 0 : ((reachedCount - continuedCount) / reachedCount) * 100;

    results.push({
      questionIndex: i,
      reachedCount,
      continuedCount,
      dropOffPercent: Math.round(dropOffPercent * 10) / 10,
    });
  }

  return results;
}

// Convenience: the single worst-offending question, for a dashboard headline
// like "Biggest leak: Question 14 (38% drop-off)".
export async function getWorstDropOffQuestion(totalQuestions = 25) {
  const rows = await computeDropOffByQuestion(totalQuestions);
  return rows.reduce((worst, r) => (r.dropOffPercent > worst.dropOffPercent ? r : worst), rows[0]);
}