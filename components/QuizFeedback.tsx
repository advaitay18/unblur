// components/QuizFeedback.tsx
"use client";

import { useState } from "react";

interface QuizFeedbackProps {
  reportId?: string;
  sessionId?: string;
}

export function QuizFeedback({ reportId, sessionId }: QuizFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Please select a rating before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, reportId, sessionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="feedback-card feedback-success">
        <div className="feedback-badge">Thank you! ✨</div>
        <h3>Your feedback has been received</h3>
        <p>Your input directly helps us make Unblur more accurate and helpful for future students.</p>
      </div>
    );
  }

  const ratingLabels: Record<number, string> = {
    1: "Needs work",
    2: "Somewhat helpful",
    3: "Good",
    4: "Very accurate",
    5: "Life-changing / spot-on",
  };

  const activeRating = hoverRating || rating || 0;

  return (
    <div className="feedback-card">
      <div className="feedback-header">
        <span className="feedback-eyebrow">Quick check-in</span>
        <h3 className="feedback-title">How accurate was this report for you?</h3>
        <p className="feedback-sub">Your anonymous feedback helps calibrate the scoring engine.</p>
      </div>

      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="feedback-rating-row">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              type="button"
              className={`feedback-rate-btn ${rating === val ? "selected" : ""} ${
                hoverRating && hoverRating >= val ? "hovered" : ""
              }`}
              onClick={() => {
                setRating(val);
                setError(null);
              }}
              onMouseEnter={() => setHoverRating(val)}
              onMouseLeave={() => setHoverRating(null)}
              aria-label={`Rate ${val} out of 5`}
            >
              <span className="feedback-num">{val}</span>
              <span className="feedback-star">{rating && rating >= val ? "★" : "☆"}</span>
            </button>
          ))}
        </div>

        {activeRating > 0 && (
          <div className="feedback-rating-label">
            {ratingLabels[activeRating]}
          </div>
        )}

        <div className="feedback-input-group">
          <label htmlFor="feedback-comment" className="feedback-label">
            Anything specific that stood out (or felt off)? <span>(Optional)</span>
          </label>
          <textarea
            id="feedback-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what you liked or how we can improve..."
            className="feedback-textarea"
          />
        </div>

        {error && <p className="feedback-error">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !rating}
          className="feedback-submit-btn"
        >
          {submitting ? "Submitting…" : "Send Feedback →"}
        </button>
      </form>
    </div>
  );
}
