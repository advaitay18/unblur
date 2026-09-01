// hooks/useQuizAnalytics.ts
// Module 4: Funnel & Telemetry Analytics Hook
// Requires: npm install posthog-js
// Env: NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST

"use client";

import { useCallback, useEffect, useRef } from "react";
import posthog from "posthog-js";

interface UseQuizAnalyticsOptions {
  // Pass null/undefined until the real session id resolves (e.g. from
  // POST /api/session) — the hook waits for a real id before firing
  // quiz_started rather than recording a placeholder value.
  sessionId: string | null | undefined;
}

export function useQuizAnalytics({ sessionId }: UseQuizAnalyticsOptions) {
  const questionStartedAt = useRef<number>(Date.now());
  const hasStarted = useRef(false);

  // Fires once, as soon as a real sessionId is available.
  useEffect(() => {
    if (!sessionId || hasStarted.current) return;
    hasStarted.current = true;
    posthog.capture("quiz_started", { session_id: sessionId, ts: Date.now() });

    // Abandonment signal: if the tab closes/unloads before completion,
    // PostHog's sendBeacon-backed capture still fires reliably.
    const handleUnload = () => {
      posthog.capture("quiz_abandoned", { session_id: sessionId, ts: Date.now() });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [sessionId]);

  // Call this every time a question's answer is selected. time_spent is
  // measured from when the question was rendered, not quiz start.
  const trackQuestionAnswered = useCallback(
    (questionIndex: number, questionId: string, optionId: string) => {
      const timeSpentMs = Date.now() - questionStartedAt.current;
      posthog.capture("question_answered", {
        session_id: sessionId ?? "unknown",
        question_index: questionIndex,
        question_id: questionId,
        option_id: optionId,
        time_spent_ms: timeSpentMs,
      });
      questionStartedAt.current = Date.now(); // reset for next question
      return timeSpentMs;
    },
    [sessionId]
  );

  // Call when a new question mounts, so time_spent is measured accurately.
  const markQuestionRendered = useCallback(() => {
    questionStartedAt.current = Date.now();
  }, []);

  const trackQuizCompleted = useCallback(() => {
    posthog.capture("quiz_completed", { session_id: sessionId ?? "unknown", ts: Date.now() });
  }, [sessionId]);

  const trackPdfDownloaded = useCallback(
    (reportId: string) => {
      posthog.capture("pdf_downloaded", { session_id: sessionId ?? "unknown", report_id: reportId, ts: Date.now() });
    },
    [sessionId]
  );

  return { trackQuestionAnswered, markQuestionRendered, trackQuizCompleted, trackPdfDownloaded };
}
