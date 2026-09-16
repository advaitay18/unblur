import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rating, comment, reportId, sessionId } = body;

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5." },
        { status: 400 }
      );
    }

    // 1. Save to PostgreSQL via Prisma (if connected)
    try {
      await prisma.feedback.create({
        data: {
          rating: Math.round(rating),
          comment: typeof comment === "string" ? comment.trim() : null,
          reportId: typeof reportId === "string" ? reportId : null,
          sessionId: typeof sessionId === "string" ? sessionId : null,
        },
      });
    } catch (dbErr) {
      console.warn("[/api/feedback] Warning: Could not persist feedback to DB:", dbErr);
    }

    // 2. Forward to Google Sheets Webhook (if configured)
    const webhookUrl =
      process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.FEEDBACK_WEBHOOK_URL;

    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            rating,
            comment: comment || "",
            reportId: reportId || "",
            sessionId: sessionId || "",
          }),
        });
      } catch (webhookErr) {
        console.error("[/api/feedback] Google Sheets Webhook dispatch failed:", webhookErr);
      }
    }

    return NextResponse.json(
      { success: true, message: "Thank you for your feedback!" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/feedback] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process feedback." },
      { status: 500 }
    );
  }
}
