// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <h1>Unblur</h1>
      <p>Know yourself first. 25 questions, 5 minutes, one honest report.</p>
      <Link href="/quiz">Start the quiz →</Link>
    </main>
  );
}
