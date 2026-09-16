// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-page">
      <div className="landing-container">
        <div className="landing-badge">Self-Discovery · 5 Minutes</div>
        <h1 className="landing-title">
          Know yourself <span className="landing-accent">first.</span>
        </h1>
        <p className="landing-subtitle">
          25 scenario-based questions designed for Indian students. No prep, no expectations—just one honest, actionable career and psychometric report.
        </p>

        <div className="landing-actions">
          <Link href="/quiz" className="landing-btn-primary">
            Start the Quiz →
          </Link>
        </div>

        <div className="landing-features">
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <h4>8 Core Archetypes</h4>
            <p>Calculated across 8 deep psychometric dimensions, not generic stereotypes.</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💼</span>
            <h4>Top 3 Careers & Salary</h4>
            <p>Realistic Year 1, 5, and 10 income projections in INR and USD.</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🧭</span>
            <h4>6-Month Action Plan</h4>
            <p>Concrete, sequenced next steps plus a reassuring guide for parents.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
