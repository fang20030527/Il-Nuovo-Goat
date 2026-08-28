"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/game/constants";
import { listSlots, type CareerSlot, type SlotSummary } from "@/persistence/career-db";
import { SlotCard } from "@/components/SlotCard";

const SLOTS: readonly CareerSlot[] = [1, 2, 3];

export default function HomePage() {
  const [summaries, setSummaries] = useState<readonly SlotSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void listSlots().then((records) => {
      if (cancelled) return;
      setSummaries(records);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const summaryFor = (slot: CareerSlot): SlotSummary | null =>
    summaries.find((entry) => entry.slot === slot) ?? null;

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Original browser football career simulator. All saves stay in this browser.</p>
      <p>
        <Link href="/world">Manage the active world</Link>
      </p>
      {!loaded && <p>Loading saves…</p>}
      {SLOTS.map((slot) => (
        <SlotCard
          key={slot}
          slot={slot}
          summary={summaryFor(slot)}
          onChanged={() => setRefreshKey((key) => key + 1)}
        />
      ))}
    </main>
  );
}
