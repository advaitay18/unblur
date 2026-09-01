// app/report/[reportId]/page.tsx
import { notFound } from "next/navigation";
import { getReportBySlug } from "@/lib/session-helpers";
import { DownloadPdfButton } from "@/components/DownloadPdfButton";
import type { UnblurReport } from "@/lib/pdf/UnblurReportPDF";

export default async function ReportPage({ params }: { params: { reportId: string } }) {
  const record = await getReportBySlug(params.reportId);
  if (!record) return notFound();

  const report = record.payload as unknown as UnblurReport;

  return (
    <div className="report-shell">
      <div className="report-hero">
        <span className="report-eyebrow">Your archetype</span>
        <h1 className="report-archetype">{report.archetype_name}</h1>
        <p className="report-archetype-desc">{report.archetype_description}</p>
        <DownloadPdfButton reportId={params.reportId} />
      </div>

      <section className="report-section">
        <h2>Top career directions</h2>
        {report.top_3_careers.map((c, i) => (
          <div key={i} className="report-career-card">
            <h3>{c.career_name}</h3>
            <p>{c.fit_reason}</p>
            <div className="report-salary-row">
              <div>
                <strong>{c.salary_projection.year_1.inr}</strong>
                <span>Year 1</span>
              </div>
              <div>
                <strong>{c.salary_projection.year_5.inr}</strong>
                <span>Year 5</span>
              </div>
              <div>
                <strong>{c.salary_projection.year_10.inr}</strong>
                <span>Year 10</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="report-section">
        <h2>Decision-pressure map</h2>
        {report.decision_pressure_map.map((d, i) => (
          <div key={i} className="report-pressure-row">
            <div className="report-pressure-head">
              <span>{d.pressure_source}</span>
              <span>{d.intensity}/100</span>
            </div>
            <p>{d.coping_pattern}</p>
          </div>
        ))}
      </section>

      <section className="report-section">
        <h2>6-month roadmap</h2>
        {report.six_month_action_roadmap.map((r, i) => (
          <div key={i} className="report-road-item">
            <span className="report-road-badge">M{r.month_range}</span>
            <div>
              <h4>{r.title}</h4>
              <p>{r.action}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="report-section">
        <h2>For parents</h2>
        <p>{report.parent_guide_summary}</p>
      </section>
    </div>
  );
}
