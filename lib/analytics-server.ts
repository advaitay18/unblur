// lib/analytics-server.ts
// Module 4: server utility for events fired from API routes

import { PostHog } from "posthog-node";
import { prisma } from "@/lib/prisma";

const serverKey = process.env.POSTHOG_SERVER_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

const client = serverKey ? new PostHog(serverKey, { host }) : null;

export async function trackServerEvent(
  event: string,
  properties: Record<string, unknown>,
  distinctId = "server"
) {
  if (!client) return;
  try {
    client.capture({ distinctId, event, properties });
    await client.flush();
  } catch (err) {
    console.warn("[analytics-server] capture error:", err);
  }
}

export interface QuestionDropOff {
  questionIndex: number;
  reachedCount: number;
  continuedCount: number;
  dropOffPercent: number;
}

export async function computeDropOffByQuestion(totalQuestions = 25): Promise<QuestionDropOff[]> {
  const results: QuestionDropOff[] = [];

  for (let i = 0; i < totalQuestions; i++) {
    try {
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
    } catch {
      results.push({
        questionIndex: i,
        reachedCount: 0,
        continuedCount: 0,
        dropOffPercent: 0,
      });
    }
  }

  return results;
}

export async function getWorstDropOffQuestion(totalQuestions = 25) {
  const rows = await computeDropOffByQuestion(totalQuestions);
  return rows.reduce((worst, r) => (r.dropOffPercent > worst.dropOffPercent ? r : worst), rows[0]);
}
