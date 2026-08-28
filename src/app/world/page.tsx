"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { World } from "@/game/domain/world";
import { loadActiveWorld, saveActiveWorld } from "@/persistence/career-db";
import { createDefaultWorld } from "@/game/world/default-world";
import { WorldOverview } from "@/components/WorldOverview";
import { WorldTransfer } from "@/components/WorldTransfer";

export default function WorldPage() {
  const [world, setWorld] = useState<World | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadActiveWorld();
      if (cancelled) return;
      if (stored) {
        setWorld(stored);
      } else {
        const fallback = createDefaultWorld();
        await saveActiveWorld(fallback);
        if (!cancelled) setWorld(fallback);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (world === null) return <main><p>Loading…</p></main>;

  return (
    <main>
      <nav className="nav-row">
        <Link href="/">Saves</Link>
      </nav>
      <p className="eyebrow green">World builder</p>
      <h1 style={{ marginTop: 0 }}>The world they play in</h1>
      <p className="muted">
        The active world is used when a new career is created. Importing a custom world here
        replaces it for future careers only.
      </p>
      <WorldOverview world={world} />
      <WorldTransfer world={world} onReplaced={() => setRefreshKey((key) => key + 1)} />
    </main>
  );
}
