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
      <header className="hero">
        <h1 className="hero-title">{APP_NAME}</h1>
        <p className="hero-tagline">
          An original browser football career sim — your saves never leave this device.
        </p>
        <div className="hero-meta">
          <span>Career sim</span>
          <span>Offline first</span>
          <span>JSON import / export</span>
        </div>
      </header>

      <section className="banner gold" aria-label="Active world">
        <p className="eyebrow">Active world</p>
        <p style={{ margin: 0 }}>
          Careers are created from the currently active world.{" "}
          <Link href="/world" style={{ color: "inherit", fontWeight: 700 }}>
            Browse or replace it
          </Link>{" "}
          with a custom universe before starting.
        </p>
      </section>

      <p className="eyebrow">Save slots</p>
      {!loaded && <p>Loading saves…</p>}
      <div className="card-grid">
        {SLOTS.map((slot) => (
          <SlotCard
            key={slot}
            slot={slot}
            summary={summaryFor(slot)}
            onChanged={() => setRefreshKey((key) => key + 1)}
          />
        ))}
      </div>
    </main>
  );
}
