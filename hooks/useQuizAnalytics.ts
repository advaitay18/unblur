// hooks/useQuizAnalytics.ts
// Module 4: Funnel & Telemetry Analytics Hook
"use client";

import { useCallback, useEffect, useRef } from "react";
import posthog from "posthog-js";

// Safe client-side PostHog initialization
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: false,
  });
}

interface UseQuizAnalyticsOptions {
  sessionId: string | null | undefined;
}

export function useQuizAnalytics({ sessionId }: UseQuizAnalyticsOptions) {
  const questionStartedAt = useRef<number>(Date.now());
  const hasStarted = useRef(false);

  // Fires once, as soon as a real sessionId is available.
  useEffect(() => {
    if (!sessionId || hasStarted.current) return;
    hasStarted.current = true;
    try {
      posthog.capture("quiz_started", { session_id: sessionId, ts: Date.now() });
    } catch {}

    const handleUnload = () => {
      try {
        posthog.capture("quiz_abandoned", { session_id: sessionId, ts: Date.now() });
      } catch {}
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [sessionId]);

  const trackQuestionAnswered = useCallback(
    (questionIndex: number, questionId: string, optionId: string) => {
      const timeSpentMs = Date.now() - questionStartedAt.current;
      try {
        posthog.capture("question_answered", {
          session_id: sessionId ?? "unknown",
          question_index: questionIndex,
          question_id: questionId,
          option_id: optionId,
          time_spent_ms: timeSpentMs,
        });
      } catch {}
      questionStartedAt.current = Date.now();
      return timeSpentMs;
    },
    [sessionId]
  );

  const markQuestionRendered = useCallback(() => {
    questionStartedAt.current = Date.now();
  }, []);

  const trackQuizCompleted = useCallback(() => {
    try {
      posthog.capture("quiz_completed", { session_id: sessionId ?? "unknown", ts: Date.now() });
    } catch {}
  }, [sessionId]);

  const trackPdfDownloaded = useCallback(
    (reportId: string) => {
      try {
        posthog.capture("pdf_downloaded", {
          session_id: sessionId ?? "unknown",
          report_id: reportId,
          ts: Date.now(),
        });
      } catch {}
    },
    [sessionId]
  );

  return { trackQuestionAnswered, markQuestionRendered, trackQuizCompleted, trackPdfDownloaded };
}
