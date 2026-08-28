"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CareerSlot } from "@/persistence/career-db";
import { useCareerSlot } from "@/hooks/use-career-slot";
import { calculateGoatScore } from "@/game/scoring/goat-score";
import { GoatScorePanel } from "@/components/GoatScorePanel";

export default function RetirementPage() {
  const params = useParams<{ slot: string }>();
  const value = Number(params.slot);
  const slot: CareerSlot = value === 2 || value === 3 ? (value as CareerSlot) : 1;
  const career = useCareerSlot(slot);

  if (career.status !== "ready" || career.state === null) {
    return <main><p>Loading…</p></main>;
  }
  if (career.state.phase !== "retired") {
    return (
      <main>
        <p>This career is still active.</p>
        <Link href={`/career/${slot}`}>Back to career</Link>
      </main>
    );
  }
  const score = calculateGoatScore(career.state);
  if (!score.ok) {
    return <main><p role="alert" className="error-text">{score.error.message}</p></main>;
  }

  return (
    <main>
      <nav className="nav-row">
        <Link href={`/career/${slot}`}>Back to career</Link>
        <Link href={`/career/${slot}/archive`}>Archive</Link>
      </nav>
      <h1>{career.state.player.name} — career review</h1>
      <GoatScorePanel breakdown={score.value} />
    </main>
  );
}
