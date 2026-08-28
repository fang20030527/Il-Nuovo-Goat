"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/game/constants";
import { RULES_VERSION } from "@/game/constants";
import { listSlots, type CareerSlot, type SlotSummary } from "@/persistence/career-db";
import { SlotCard } from "@/components/SlotCard";

const SLOTS: readonly CareerSlot[] = [1, 2, 3];

const LAST_UPDATE = "28/08";

const GAME_MODES = [
  {
    key: "classic",
    badge: "Fast",
    badgeClass: "",
    title: "Classic",
    description: "Season in one go · standings right away · trophy per competition",
  },
  {
    key: "detailed",
    badge: "Immersive",
    badgeClass: "green",
    title: "Detailed",
    description: "Immersive report · boards step by step · match sims",
  },
] as const;

const DAILY_CHALLENGES = [
  {
    title: "Bomber da 300",
    description: "Chiudi una carriera con almeno 300 gol totali.",
    target: 300,
  },
  {
    title: "Muro Invalicabile",
    description: "Finish a season with fewer than 20 goals conceded.",
    target: 20,
  },
  {
    title: "Campionissimo",
    description: "Win the top division in three different countries.",
    target: 3,
  },
] as const;

const dayOfYear = Math.floor(
  (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
);
const dailyChallenge = DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];

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
        <div className="hero-pitch" aria-hidden="true">
          <svg viewBox="0 0 1200 460" preserveAspectRatio="xMidYMid slice">
            <g className="pitch-lines">
              <line x1="0" y1="14" x2="1200" y2="14" />
              <line x1="0" y1="446" x2="1200" y2="446" />
              <line x1="600" y1="14" x2="600" y2="446" />
              <rect x="160" y="120" width="180" height="220" />
              <rect x="230" y="180" width="110" height="100" />
              <path d="M 340 200 Q 420 230 340 260" fill="none" />
              <rect x="860" y="120" width="180" height="220" />
              <rect x="860" y="180" width="110" height="100" />
              <path d="M 860 200 Q 780 230 860 260" fill="none" />
            </g>
            <circle className="pitch-orbit" cx="600" cy="230" r="100" />
            <g className="hero-ball">
              <circle className="ball-halo" r="19" />
              <g className="ball-spin">
                <circle className="ball-body" r="13" />
                <path
                  className="ball-seams"
                  d="M 0 -6 L 5.7 -1.9 L 3.5 4.9 L -3.5 4.9 L -5.7 -1.9 Z M 0 -6 L 0 -13 M 5.7 -1.9 L 12.1 -2.6 M 3.5 4.9 L 7.3 10.8 M -3.5 4.9 L -7.3 10.8 M -5.7 -1.9 L -12.1 -2.6"
                />
              </g>
              <animateMotion dur="14s" repeatCount="indefinite" path="M 600 130 A 100 100 0 1 1 599.9 130" />
            </g>
          </svg>
        </div>
        <div className="hero-content">
          <h1 className="hero-title">{APP_NAME}</h1>
          <p className="hero-tagline">
            An original browser football career sim — your saves never leave this device.
          </p>
          <div className="hero-meta">
            <span>Career sim</span>
            <span>Offline first</span>
            <span>JSON import / export</span>
          </div>
        </div>
      </header>

      <div className="version-strip">
        <span className="muted">Version {RULES_VERSION}</span>
        <span className="muted">Last update: {LAST_UPDATE}</span>
      </div>

      <p className="eyebrow">Career mode</p>
      <div className="card-grid" style={{ marginBottom: "1.5rem" }}>
        {GAME_MODES.map((mode) => (
          <Link
            key={mode.key}
            href={`/career/new?slot=1&mode=${mode.key}`}
            className="mode-card mode-card-link"
          >
            <span className={`card-label ${mode.badgeClass}`}>{mode.badge}</span>
            <h2 className="card-title">{mode.title}</h2>
            <p className="muted">{mode.description}</p>
          </Link>
        ))}
      </div>

      <section className="banner purple" aria-label="Daily challenge">
        <div className="banner-body">
          <p className="eyebrow" style={{ margin: 0 }}>Today&apos;s challenge</p>
          <h2 className="banner-title">{dailyChallenge.title}</h2>
          <p style={{ margin: "0.35rem 0 0" }}>{dailyChallenge.description}</p>
        </div>
        <div className="banner-side">
          <div className="banner-stat">
            <span className="banner-stat-value">0</span>
            <span className="banner-stat-label">Streak</span>
          </div>
          <div className="banner-stat">
            <span className="banner-stat-label">Target</span>
            <span className="banner-stat-value">{dailyChallenge.target}</span>
          </div>
        </div>
      </section>

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
