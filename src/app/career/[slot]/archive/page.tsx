"use client";

import { useParams } from "next/navigation";
import type { CareerSlot } from "@/persistence/career-db";
import { useCareerSlot } from "@/hooks/use-career-slot";
import { ArchiveTable } from "@/components/ArchiveTable";
import Link from "next/link";

export default function ArchivePage() {
  const params = useParams<{ slot: string }>();
  const value = Number(params.slot);
  const slot: CareerSlot = value === 2 || value === 3 ? (value as CareerSlot) : 1;
  const career = useCareerSlot(slot);

  if (career.status !== "ready" || career.state === null) {
    return <main><p>Loading…</p></main>;
  }

  return (
    <main>
      <nav className="nav-row">
        <Link href={`/career/${slot}`}>Back to career</Link>
      </nav>
      <h1>Archive — {career.state.player.name}</h1>
      <ArchiveTable state={career.state} />
    </main>
  );
}
