// components/DownloadPdfButton.tsx
"use client";

import { useState } from "react";

export function DownloadPdfButton({ reportId, studentName }: { reportId: string; studentName?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleDownload() {
    setStatus("loading");
    try {
      const url = `/api/pdf/${reportId}${studentName ? `?name=${encodeURIComponent(studentName)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `unblur-report-${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={status === "loading"}
      className="pdf-btn"
      style={{
        padding: "13px 24px",
        borderRadius: 12,
        border: "none",
        background: status === "error" ? "#e86868" : "#d4a853",
        color: "#09090f",
        fontWeight: 600,
        fontSize: 14,
        cursor: status === "loading" ? "wait" : "pointer",
        opacity: status === "loading" ? 0.7 : 1,
        transition: "opacity .2s",
      }}
    >
      {status === "loading" ? "Generating PDF…" : status === "error" ? "Failed — retry" : "Download PDF Report"}
    </button>
  );
}
