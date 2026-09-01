// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unblur — Know Yourself First",
  description: "A free, 5-minute, 25-question scenario-based career discovery quiz.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
