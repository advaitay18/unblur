import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getReportBySlug } from "@/lib/session-helpers";
import { UnblurReportPDF, type UnblurReport } from "@/lib/pdf/UnblurReportPDF";
import React from "react";

export async function GET(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const reportId = params.reportId;
    const { searchParams } = new URL(req.url);
    const studentName = searchParams.get("name") || undefined;

    if (!reportId) {
      return new NextResponse("Missing reportId", { status: 400 });
    }

    const record = await getReportBySlug(reportId);
    if (!record) {
      return new NextResponse("Report not found", { status: 404 });
    }

    const report = record.payload as unknown as UnblurReport;
    const pdfElement = React.createElement(UnblurReportPDF, { report, studentName }) as any;
    const pdfBuffer = await renderToBuffer(pdfElement);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="unblur-report-${reportId}.pdf"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: any) {
    console.error("[/api/pdf/[reportId]] error:", err);
    return new NextResponse(err?.message || "Failed to generate PDF", { status: 500 });
  }
}
