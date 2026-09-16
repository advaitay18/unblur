import { NextRequest, NextResponse } from "next/server";
import { getReportBySlug } from "@/lib/session-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const reportId = params.reportId;
    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId parameter." }, { status: 400 });
    }

    const record = await getReportBySlug(reportId);
    if (!record) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    return NextResponse.json({
      reportId: record.slug,
      id: record.id,
      sessionId: record.sessionId,
      report: record.payload,
      createdAt: record.createdAt,
    });
  } catch (err: any) {
    console.error("[/api/report/[reportId]] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve report." },
      { status: 500 }
    );
  }
}
