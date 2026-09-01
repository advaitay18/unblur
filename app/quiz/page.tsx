// app/quiz/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTION_BANK } from "@/lib/question-bank";
import { useQuizAnalytics } from "@/hooks/useQuizAnalytics";

interface StoredAnswer {
  questionId: string;
  optionId: string; // option id for pair/choice, stringified 1-10 for slider
}

const SESSION_STORAGE_KEY = "unblur_session_id";

export default function QuizPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<StoredAnswer[]>([]);
  const [sliderValue, setSliderValue] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = QUESTION_BANK[qIndex];
  const totalQuestions = QUESTION_BANK.length;
  const progressPct = Math.round((qIndex / totalQuestions) * 100);

  // Hook itself waits for a real (non-null) sessionId before firing quiz_started.
  const analytics = useQuizAnalytics({ sessionId });

  // ---- Session bootstrap: create once, resume on refresh ----
  useEffect(() => {
    async function bootstrap() {
      const cached = localStorage.getItem(SESSION_STORAGE_KEY);
      if (cached) {
        // Resume: trust localStorage for now; a stricter implementation
        // would GET /api/session?id=cached and rehydrate qIndex/answers
        // from session.responses to survive a cleared-but-not-fresh state.
        setSessionId(cached);
        return;
      }
      const res = await fetch("/api/session", { method: "POST" });
      const data = await res.json();
      localStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      setSessionId(data.sessionId);
    }
    bootstrap();
  }, []);

  // Reset the per-question timer whenever the visible question changes.
  useEffect(() => {
    if (!sessionId) return;
    analytics.markQuestionRendered();
    setSliderValue(5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, sessionId]);

  async function saveProgress(questionId: string, optionId: string, index: number, timeSpentMs: number) {
    if (!sessionId) return;
    try {
      await fetch(`/api/session/${sessionId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, optionId, questionIndex: index, timeSpentMs }),
      });
    } catch {
      // Non-fatal: local state still has the answer; a later question's
      // save (or the final submit) will catch the DB back up.
    }
  }

  function recordAnswer(optionId: string) {
    if (!sessionId || !question) return;
    const timeSpentMs = analytics.trackQuestionAnswered(qIndex, question.id, optionId);

    setAnswers((prev) => {
      const withoutCurrent = prev.filter((a) => a.questionId !== question.id);
      return [...withoutCurrent, { questionId: question.id, optionId }];
    });

    saveProgress(question.id, optionId, qIndex, timeSpentMs);

    if (qIndex + 1 < totalQuestions) {
      setQIndex(qIndex + 1);
    } else {
      submitQuiz([...answers.filter((a) => a.questionId !== question.id), { questionId: question.id, optionId }]);
    }
  }

  async function submitQuiz(finalAnswers: StoredAnswer[]) {
    if (!sessionId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers: finalAnswers }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to generate report.");

      const data = await res.json();
      analytics.trackQuizCompleted();
      localStorage.removeItem(SESSION_STORAGE_KEY);
      router.push(`/report/${data.reportId}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong generating your report. Please try again.");
      setSubmitting(false);
    }
  }

  function goBack() {
    if (qIndex > 0) setQIndex(qIndex - 1);
  }

  if (!sessionId || !question) {
    return <div className="quiz-loading">Loading…</div>;
  }

  if (submitting) {
    return <ReportGenerationSkeleton />;
  }

  const prevAnswer = answers.find((a) => a.questionId === question.id);

  return (
    <div className="quiz-shell">
      <div className="quiz-progress-track">
        <div className="quiz-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="quiz-meta">
        <span>Section {question.section + 1} of 5 · {question.sectionName}</span>
        <span>{progressPct}%</span>
      </div>

      <div className="quiz-card">
        <div className="quiz-ctx">{question.context}</div>
        <h2 className="quiz-text">{question.text}</h2>

        {question.type === "pair" && question.options && (
          <div className="quiz-pair-grid">
            {question.options.map((opt) => (
              <button
                key={opt.id}
                className={`quiz-pair-opt ${prevAnswer?.optionId === opt.id ? "selected" : ""}`}
                onClick={() => recordAnswer(opt.id)}
              >
                {opt.text}
              </button>
            ))}
          </div>
        )}

        {question.type === "choice" && question.options && (
          <div className="quiz-choice-list">
            {question.options.map((opt) => (
              <button
                key={opt.id}
                className={`quiz-choice-opt ${prevAnswer?.optionId === opt.id ? "selected" : ""}`}
                onClick={() => recordAnswer(opt.id)}
              >
                {opt.text}
              </button>
            ))}
          </div>
        )}

        {question.type === "slider" && question.slider && (
          <div className="quiz-slider-wrap">
            <div className="quiz-slider-labels">
              <span>{question.slider.lowLabel}</span>
              <span>{question.slider.highLabel}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
            />
            <div className="quiz-slider-value">{sliderValue}</div>
            <button className="quiz-slider-confirm" onClick={() => recordAnswer(String(sliderValue))}>
              Confirm →
            </button>
          </div>
        )}

        {error && <div className="quiz-error">{error}</div>}

        <div className="quiz-nav">
          <button onClick={goBack} disabled={qIndex === 0}>
            ← Previous
          </button>
          <span>{totalQuestions - qIndex - 1} left</span>
        </div>
      </div>
    </div>
  );
}

// Inline loading skeleton shown while /api/analyze generates the structured
// report (typically several seconds for a Gemini structured-output call).
function ReportGenerationSkeleton() {
  return (
    <div className="report-skeleton">
      <div className="skeleton-pulse skeleton-title" />
      <div className="skeleton-pulse skeleton-line" />
      <div className="skeleton-pulse skeleton-line short" />
      <div className="skeleton-block-grid">
        <div className="skeleton-pulse skeleton-block" />
        <div className="skeleton-pulse skeleton-block" />
        <div className="skeleton-pulse skeleton-block" />
      </div>
      <p className="skeleton-caption">Reading your answers and building your report…</p>
    </div>
  );
}
