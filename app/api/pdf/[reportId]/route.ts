// app/api/pdf/[reportId]/route.ts
// Module 3: streams the generated vector PDF back to the browser.

import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { UnblurReportPDF, UnblurReport } from "@/lib/pdf/UnblurReportPDF";
import { getReportBySlug } from "@/lib/session-helpers";
import { trackServerEvent } from "@/lib/analytics-server";

// Force runtime execution so Vercel skips pre-rendering page data during build
export const dynamic = "force-dynamic";

// NOTE: this file stays .ts (not .tsx) per Next.js API route convention, so
// the PDF element is built with React.createElement rather than JSX.

export async function GET(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const record = await getReportBySlug(params.reportId);

  if (!record) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const report = record.payload as unknown as UnblurReport;
  const studentName = req.nextUrl.searchParams.get("name") ?? undefined;

  const stream = await renderToStream(
    React.createElement(UnblurReportPDF, { report, studentName })
  );

  // Fire-and-forget telemetry (Module 4) — don't block the download on it.
  trackServerEvent("pdf_downloaded", { reportId: params.reportId }).catch(() => {});

  // renderToStream returns a Node Readable; wrap it as a Web ReadableStream
  // for the Next.js Response API.
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": attachment; filename="unblur-report-${params.reportId}.pdf",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}