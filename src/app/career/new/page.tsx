"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { World } from "@/game/domain/world";
import type { CareerSlot } from "@/persistence/career-db";
import { loadActiveWorld, loadSlot } from "@/persistence/career-db";
import { createDefaultWorld } from "@/game/world/default-world";
import { NewCareerForm } from "@/components/NewCareerForm";

const NewCareerInner = () => {
  const params = useSearchParams();
  const slotParam = Number(params.get("slot") ?? "1");
  const slot = (slotParam === 2 || slotParam === 3 ? slotParam : 1) as CareerSlot;
  const modeParam = params.get("mode");
  const defaultMode = modeParam === "detailed" ? "detailed" as const : "classic" as const;
  const [world, setWorld] = useState<World | null>(null);
  const [occupied, setOccupied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await loadActiveWorld();
        const existing = await loadSlot(slot);
        if (cancelled) return;
        setWorld(stored ?? createDefaultWorld());
        setOccupied(existing !== null);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Failed to load world");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slot]);

  if (error !== null) return <main><p role="alert" className="error-text">{error}</p></main>;
  if (world === null) return <main><p>Loading…</p></main>;

  return (
    <main>
      <nav className="nav-row">
        <Link href="/">Saves</Link>
        <Link href="/world">World</Link>
      </nav>
      <p className="eyebrow">New career</p>
      <h1 style={{ marginTop: 0 }}>Your story begins — slot {slot}</h1>
      <p className="muted">
        Pick a name, a position, and the world you start in. Everything is simulated locally and
        deterministically from your seed.
      </p>
      {occupied && <p className="error-text">This slot already holds a career; creating will replace it.</p>}
      <NewCareerForm slot={slot} world={world} occupied={occupied} defaultMode={defaultMode} />
    </main>
  );
};

export default function NewCareerPage() {
  return (
    <Suspense fallback={<main><p>Loading…</p></main>}>
      <NewCareerInner />
    </Suspense>
  );
}
