// lib/pdf/UnblurReportPDF.tsx
// Module 3: server-rendered vector PDF, mirrors the app's dark/warm-gold
// aesthetic using @react-pdf/renderer primitives only (no HTML/CSS).
// Requires: npm install @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Register a real font so the PDF isn't stuck on Helvetica — matches the
// product's Outfit/Instrument Serif brand voice as closely as PDF fonts allow.
Font.register({
  family: "Outfit",
  fonts: [
    { src: "https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4W7Y.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4W7Y.ttf", fontWeight: 700 },
  ],
});

const INK = "#09090f";
const WARM = "#d4a853";
const TEXT = "#1c1c24";
const MUTED = "#6b6878";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Outfit", fontSize: 11, color: TEXT },
  coverPage: {
    backgroundColor: INK,
    padding: 60,
    color: "#f0ebe0",
    justifyContent: "center",
    height: "100%",
  },
  coverTitle: { fontSize: 34, fontWeight: 700, color: WARM, marginBottom: 12 },
  coverSub: { fontSize: 13, color: "#9490a8" },
  sectionHead: { fontSize: 16, fontWeight: 700, color: INK, marginBottom: 8, marginTop: 20 },
  sectionLabel: { fontSize: 9, color: WARM, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" },
  p: { fontSize: 11, lineHeight: 1.5, color: TEXT, marginBottom: 6 },
  muted: { fontSize: 9, color: MUTED },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metricBox: { flex: 1, borderWidth: 1, borderColor: "#e5e2da", borderRadius: 6, padding: 10, marginRight: 8 },
  metricVal: { fontSize: 13, fontWeight: 700, color: INK },
  metricLbl: { fontSize: 8, color: MUTED, marginTop: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e2da", marginVertical: 14 },
  roadItem: { flexDirection: "row", marginBottom: 10 },
  roadBadge: {
    width: 40, fontSize: 9, fontWeight: 700, color: WARM,
  },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: MUTED, textAlign: "center" },
});

// Shape matches the JSON schema returned by Module 1's /api/analyze route.
export interface UnblurReport {
  archetype_name: string;
  archetype_description: string;
  decision_pressure_map: { pressure_source: string; intensity: number; coping_pattern: string }[];
  top_3_careers: {
    career_name: string;
    fit_reason: string;
    salary_projection: {
      year_1: { inr: string; usd: string };
      year_5: { inr: string; usd: string };
      year_10: { inr: string; usd: string };
    };
  }[];
  university_and_scholarship_recommendations: {
    university: string;
    country: string;
    program_fit: string;
    scholarship_note: string;
  }[];
  six_month_action_roadmap: { month_range: string; title: string; action: string }[];
  parent_guide_summary: string;
}

export function UnblurReportPDF({ report, studentName }: { report: UnblurReport; studentName?: string }) {
  return (
    <Document title={`Unblur Report — ${studentName ?? "Career Discovery"}`}>
      {/* Cover page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverSub}>UNBLUR · CAREER DISCOVERY REPORT</Text>
        <Text style={styles.coverTitle}>{report.archetype_name}</Text>
        <Text style={{ fontSize: 12, color: "#c8c4d8", lineHeight: 1.6 }}>
          {report.archetype_description}
        </Text>
        {studentName && <Text style={{ marginTop: 30, fontSize: 10, color: "#6b6878" }}>Prepared for {studentName}</Text>}
      </Page>

      {/* Careers + salary projections */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionLabel}>Top career directions</Text>
        <Text style={styles.sectionHead}>Where your profile points</Text>
        {report.top_3_careers.map((c, i) => (
          <View key={i} wrap={false} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 3 }}>
              {i + 1}. {c.career_name}
            </Text>
            <Text style={styles.p}>{c.fit_reason}</Text>
            <View style={styles.row}>
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>{c.salary_projection.year_1.inr}</Text>
                <Text style={styles.metricLbl}>Year 1 ({c.salary_projection.year_1.usd})</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>{c.salary_projection.year_5.inr}</Text>
                <Text style={styles.metricLbl}>Year 5 ({c.salary_projection.year_5.usd})</Text>
              </View>
              <View style={[styles.metricBox, { marginRight: 0 }]}>
                <Text style={styles.metricVal}>{c.salary_projection.year_10.inr}</Text>
                <Text style={styles.metricLbl}>Year 10 ({c.salary_projection.year_10.usd})</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Decision-pressure map</Text>
        <Text style={styles.sectionHead}>What's actually driving the indecision</Text>
        {report.decision_pressure_map.map((d, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: 700 }}>
              {d.pressure_source} — {d.intensity}/100
            </Text>
            <Text style={styles.p}>{d.coping_pattern}</Text>
          </View>
        ))}
        <Text style={styles.footer}>unblur.app · Know yourself first</Text>
      </Page>

      {/* Roadmap + universities + parent guide */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionLabel}>Six-month roadmap</Text>
        <Text style={styles.sectionHead}>What to actually do next</Text>
        {report.six_month_action_roadmap.map((r, i) => (
          <View key={i} style={styles.roadItem}>
            <Text style={styles.roadBadge}>M{r.month_range}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: 700 }}>{r.title}</Text>
              <Text style={styles.p}>{r.action}</Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Universities & scholarships</Text>
        <Text style={styles.sectionHead}>Where to point applications</Text>
        {report.university_and_scholarship_recommendations.map((u, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: 700 }}>
              {u.university} ({u.country})
            </Text>
            <Text style={styles.p}>{u.program_fit}</Text>
            <Text style={styles.muted}>{u.scholarship_note}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>For parents</Text>
        <Text style={styles.p}>{report.parent_guide_summary}</Text>
        <Text style={styles.footer}>unblur.app · Know yourself first</Text>
      </Page>
    </Document>
  );
}
