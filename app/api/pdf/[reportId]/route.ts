import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { UnblurReportPDF, UnblurReport } from "@/lib/pdf/UnblurReportPDF";
import { getReportBySlug } from "@/lib/session-helpers";
import { trackServerEvent } from "@/lib/analytics-server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;

  const record = await getReportBySlug(reportId);

  if (!record) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const report = record.payload as unknown as UnblurReport;
  const studentName = req.nextUrl.searchParams.get("name") ?? undefined;

  const stream = await renderToStream(
    React.createElement(UnblurReportPDF, { report, studentName })
  );

  trackServerEvent("pdf_downloaded", { reportId }).catch(() => {});

  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", "attachment; filename=unblur-report-" + reportId + ".pdf");
  headers.set("Cache-Control", "private, max-age=0, must-revalidate");

  return new NextResponse(webStream, {
    status: 200,
    headers,
  });
}