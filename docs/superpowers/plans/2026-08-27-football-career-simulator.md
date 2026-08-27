# Football Career Simulator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an original, deterministic Next.js football-player career simulator with classic and detailed modes, a four-country fictional world, local saves, JSON import/export, and an explainable retirement score.

**Architecture:** Keep the game as pure TypeScript functions that consume immutable state plus explicit RNG state and return new state plus domain events. Next.js App Router supplies a minimal client shell, while IndexedDB and versioned JSON adapters persist complete career snapshots without leaking browser dependencies into the engine.

**Tech Stack:** Node.js 22.22.2, pnpm 10.33.1, Next.js 16.3.3, React 19.2.8, TypeScript 5.9.3, Zod 4.4.3, idb 8.0.3, Vitest 4.1.11, fast-check 4.9.0, Playwright 1.62.1.

## Global Constraints

- The app uses Next.js App Router and TypeScript; game rules may not import Next.js, React, DOM, IndexedDB, system time, or implicit randomness.
- A career starts at age 16, retires after the age-36 season, and supports classic and detailed modes with mode changes only at a season boundary.
- The bundled world contains exactly four fictional countries, two divisions per country, ten clubs per division, domestic cups, two-up/two-down promotion, a continental cup, and fictional national teams.
- The player has exactly four position families: goalkeeper, defender, midfielder, and forward.
- The event catalog contains at least 72 original static events across ten approved categories and does not call an AI service.
- Saves use three IndexedDB slots plus versioned JSON import/export; no account, server database, cloud save, leaderboard, lobby, ranking, payment, or external API is introduced.
- No real club, player, league, badge, competition, target-site copy, target-site data, target-site code, target-site branding, or target-site visual design may be included.
- Every gameplay transition is deterministic for the same rules version, world data, seed, RNG cursor, and command sequence.
- Unit, property, deterministic-career, import-safety, and browser end-to-end tests are required before delivery.

---

## File Responsibility Map

```text
package.json                              dependency and command contract
next.config.ts                            Next.js configuration
vitest.config.ts                          engine/unit test configuration
playwright.config.ts                      browser test configuration
src/app/layout.tsx                        root document shell
src/app/page.tsx                          three-slot home screen
src/app/career/new/page.tsx               new-career route
src/app/career/[slot]/page.tsx            active-career route
src/app/career/[slot]/archive/page.tsx    career archive route
src/app/career/[slot]/retirement/page.tsx retirement score route
src/app/world/page.tsx                    world import/export route
src/app/globals.css                       minimal accessible layout rules
src/components/                           forms and semantic data panels only
src/game/domain/ids.ts                    branded ID helpers
src/game/domain/world.ts                  world, country, league, club types
src/game/domain/player.ts                 player, contract, injury, stats types
src/game/domain/competition.ts            fixtures, tables, cups, match types
src/game/domain/career.ts                 save aggregate and career phases
src/game/domain/commands.ts               public application command union
src/game/domain/errors.ts                 structured domain error contract
src/game/engine/rng.ts                    deterministic PRNG and cursor
src/game/engine/schedule.ts               round-robin and knockout schedules
src/game/engine/table.ts                  standings updates and sorting
src/game/engine/match.ts                  common match simulation
src/game/engine/moments.ts                position-specific detailed choices
src/game/engine/progression.ts            age curve and training progression
src/game/engine/injuries.ts               injury risk and recovery
src/game/engine/transfers.ts              contracts, roles, loans, offers
src/game/engine/season.ts                 competition and season orchestration
src/game/events/catalog/                  ten original event-category files
src/game/events/select-event.ts           eligibility, cooldown, weighted draw
src/game/events/apply-event-choice.ts     event-effect application
src/game/scoring/goat-score.ts            0-1000 position-normalized score
src/game/world/default-world.ts           four-country, eighty-club dataset
src/game/world/schema.ts                  versioned Zod world schema
src/game/world/import-world.ts            parse/validate/preview adapter
src/game/application/create-career.ts     initial career aggregate
src/game/application/dispatch-command.ts  pure command state machine
src/game/application/auto-strategy.ts     deterministic full-career tests
src/persistence/career-db.ts              IndexedDB slots and backup snapshots
src/persistence/json-transfer.ts          save/world JSON import/export
src/hooks/use-career-slot.ts              UI persistence/dispatch coordinator
tests/unit/                               focused engine tests
tests/property/                           fast-check invariants
tests/integration/                        season and full-career tests
tests/e2e/                                Playwright browser flows
docs/world-format.md                      player-import format
README.md                                 setup, commands, and scope
```

### Task 1: Scaffold the Next.js and test foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `tests/unit/smoke.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `pnpm test`, `pnpm build`, `pnpm lint`, and `pnpm e2e` command contracts used by every later task.

- [ ] **Step 1: Write the package and compiler contracts**

```json
{
  "name": "football-career-simulator",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.33.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "dependencies": {
    "idb": "8.0.3",
    "next": "16.3.3",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1",
    "@types/node": "26.4.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.5",
    "eslint": "10.9.1",
    "eslint-config-next": "16.3.3",
    "fake-indexeddb": "6.2.5",
    "fast-check": "4.9.0",
    "typescript": "5.9.3",
    "vitest": "4.1.11"
  }
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;
```

```ts
// vitest.config.ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:3000", reuseExistingServer: true },
});
```

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "playwright-report/**", "test-results/**"]),
]);
```

- [ ] **Step 2: Install the locked dependencies**

Run: `pnpm install`

Expected: `pnpm-lock.yaml` is created and installation exits 0.

- [ ] **Step 3: Write the failing smoke test**

```ts
import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/game/constants";

describe("project foundation", () => {
  it("exposes the original product name", () => {
    expect(APP_NAME).toBe("Open Pitch Legacy");
  });
});
```

- [ ] **Step 4: Run the smoke test and verify failure**

Run: `pnpm test -- tests/unit/smoke.test.ts`

Expected: FAIL because `@/game/constants` does not exist.

- [ ] **Step 5: Add the minimal application constant and root page**

```ts
// src/game/constants.ts
export const APP_NAME = "Open Pitch Legacy";
export const RULES_VERSION = "1.0.0";
export const SAVE_SCHEMA_VERSION = 1;
export const WORLD_SCHEMA_VERSION = 1;
```

```tsx
// src/app/page.tsx
import { APP_NAME } from "@/game/constants";

export default function HomePage() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Original browser football career simulator.</p>
    </main>
  );
}
```

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = { title: "Open Pitch Legacy" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
```

```css
/* src/app/globals.css */
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; line-height: 1.5; }
main { width: min(72rem, 100%); margin-inline: auto; padding: 1rem; }
button, input, select { min-height: 44px; font: inherit; }
```

- [ ] **Step 6: Run foundation verification**

Run: `pnpm test -- tests/unit/smoke.test.ts && pnpm lint && pnpm build`

Expected: one passing test, ESLint exits 0, and Next.js creates `.next` successfully.

- [ ] **Step 7: Commit the foundation**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts eslint.config.mjs vitest.config.ts playwright.config.ts src/app src/game/constants.ts tests/unit/smoke.test.ts
git commit -m "chore: scaffold football career simulator"
```

### Task 2: Define the immutable domain and command contracts

**Files:**
- Create: `src/game/domain/ids.ts`
- Create: `src/game/domain/world.ts`
- Create: `src/game/domain/player.ts`
- Create: `src/game/domain/competition.ts`
- Create: `src/game/domain/career.ts`
- Create: `src/game/domain/commands.ts`
- Create: `src/game/domain/errors.ts`
- Create: `tests/unit/domain.test.ts`

**Interfaces:**
- Consumes: `RULES_VERSION`, `SAVE_SCHEMA_VERSION` from `src/game/constants.ts`.
- Produces: `CareerState`, `GameCommand`, `GameResult<T>`, `World`, `Player`, `Fixture`, `MatchResult`, and branded ID types used by all later tasks.

- [ ] **Step 1: Write compile-time and runtime domain tests**

```ts
import { describe, expect, it } from "vitest";
import { clubId, countryId, leagueId } from "@/game/domain/ids";
import { emptySeasonStats } from "@/game/domain/player";

describe("domain contracts", () => {
  it("creates stable branded IDs without changing their wire value", () => {
    expect(clubId("northland-aster-vale")).toBe("northland-aster-vale");
    expect(countryId("northland")).toBe("northland");
    expect(leagueId("northland-1")).toBe("northland-1");
  });

  it("creates independent zeroed season statistics", () => {
    const stats = emptySeasonStats();
    expect(stats).toEqual({
      appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0,
      cleanSheets: 0, saves: 0, yellowCards: 0, redCards: 0,
      defensiveActions: 0, chancesCreated: 0, goalsPrevented: 0,
      ratingTotal: 0, ratedMatches: 0,
    });
  });
});
```

- [ ] **Step 2: Run the domain test and verify failure**

Run: `pnpm test -- tests/unit/domain.test.ts`

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Implement exact ID, error, world, player, competition, career, and command shapes**

```ts
// src/game/domain/ids.ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type CountryId = Brand<string, "CountryId">;
export type LeagueId = Brand<string, "LeagueId">;
export type ClubId = Brand<string, "ClubId">;
export type FixtureId = Brand<string, "FixtureId">;
export type EventId = Brand<string, "EventId">;
export const countryId = (value: string) => value as CountryId;
export const leagueId = (value: string) => value as LeagueId;
export const clubId = (value: string) => value as ClubId;
export const fixtureId = (value: string) => value as FixtureId;
export const eventId = (value: string) => value as EventId;
```

```ts
// required public discriminants
export type PositionFamily = "goalkeeper" | "defender" | "midfielder" | "forward";
export type GameMode = "classic" | "detailed";
export type CareerPhase =
  | "preseason" | "classic-checkpoint" | "detailed-prematch"
  | "detailed-moment" | "detailed-postmatch" | "season-review"
  | "transfer-window" | "retired";
export type TrainingFocus = "technique" | "awareness" | "physical" | "mentality";
export type CareerIntent = "earn-start" | "steady-growth" | "chase-honours" | "seek-transfer";
export type CompetitionKind = "league" | "domestic-cup" | "continental" | "national-team";
export type Difficulty = "story" | "balanced" | "hard";
```

Use these exact persisted shapes, split across the listed domain files:

```ts
export interface Country {
  readonly id: CountryId;
  readonly name: string;
  readonly nationalTeamStrength: number;
}
export interface League {
  readonly id: LeagueId;
  readonly countryId: CountryId;
  readonly name: string;
  readonly level: 1 | 2;
}
export interface Club {
  readonly id: ClubId;
  readonly name: string;
  readonly countryId: CountryId;
  readonly leagueId: LeagueId;
  readonly reputation: number;
  readonly finances: number;
  readonly academy: number;
  readonly facilities: number;
  readonly lines: Readonly<Record<PositionFamily, number>>;
  readonly style: "balanced" | "pressing" | "counter" | "possession" | "direct";
  readonly homeAdvantage: number;
}
export interface World {
  readonly schemaVersion: 1;
  readonly countries: readonly Country[];
  readonly leagues: readonly League[];
  readonly clubs: readonly Club[];
}
```

```ts
export interface PlayerAttributes {
  readonly technique: number;
  readonly awareness: number;
  readonly physical: number;
  readonly mentality: number;
}
export interface SeasonStats {
  readonly appearances: number; readonly starts: number; readonly minutes: number;
  readonly goals: number; readonly assists: number; readonly cleanSheets: number;
  readonly saves: number; readonly yellowCards: number; readonly redCards: number;
  readonly defensiveActions: number; readonly chancesCreated: number; readonly goalsPrevented: number;
  readonly ratingTotal: number; readonly ratedMatches: number;
}
export interface Contract {
  readonly clubId: ClubId; readonly startSeason: number; readonly endSeason: number;
  readonly weeklyWage: number; readonly appearanceBonus: number; readonly titleBonus: number;
  readonly role: "prospect" | "rotation" | "starter" | "star";
  readonly parentClubId: ClubId | null;
}
export interface TransferOffer {
  readonly id: string; readonly clubId: ClubId; readonly financialFit: number;
  readonly contract: Contract; readonly marketValue: number;
}
export interface Injury {
  readonly id: string;
  readonly severity: "knock" | "strain" | "fracture" | "major";
  readonly remainingMatches: number;
  readonly potentialDeltaOnRecovery: number;
  readonly physicalDeltaOnRecovery: number;
}
export interface Player {
  readonly id: string; readonly name: string; readonly nationality: CountryId;
  readonly position: PositionFamily; readonly preferredFoot: "left" | "right";
  readonly shirtNumber: number; readonly age: number; readonly attributes: PlayerAttributes;
  readonly overall: number; readonly potential: number; readonly fitness: number;
  readonly form: number; readonly morale: number; readonly coachTrust: number;
  readonly reputation: number; readonly marketValue: number; readonly clubId: ClubId;
  readonly contract: Contract; readonly injury: Injury | null;
  readonly currentSeasonStats: SeasonStats; readonly careerStats: SeasonStats;
  readonly nationalTeam: { readonly selected: boolean; readonly caps: number; readonly goals: number };
  readonly tags: readonly string[];
}
export const emptySeasonStats = (): SeasonStats => ({
  appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0,
  cleanSheets: 0, saves: 0, yellowCards: 0, redCards: 0,
  defensiveActions: 0, chancesCreated: 0, goalsPrevented: 0,
  ratingTotal: 0, ratedMatches: 0,
});
```

```ts
export interface Fixture {
  readonly id: FixtureId; readonly competitionId: string; readonly kind: CompetitionKind;
  readonly season: number; readonly round: number; readonly homeClubId: ClubId;
  readonly awayClubId: ClubId; readonly status: "scheduled" | "in-progress" | "complete";
}
export interface PlayerMatchPerformance extends SeasonStats { readonly rating: number; readonly minutes: number }
export interface MatchResult {
  readonly fixtureId: FixtureId; readonly homeClubId: ClubId; readonly awayClubId: ClubId;
  readonly homeGoals: number; readonly awayGoals: number;
  readonly playerPerformance: PlayerMatchPerformance | null;
  readonly timeline: readonly string[];
}
export interface LeagueTableRow {
  readonly clubId: ClubId; readonly played: number; readonly won: number;
  readonly drawn: number; readonly lost: number; readonly goalsFor: number;
  readonly goalsAgainst: number; readonly points: number;
}
```

```ts
export interface ActiveMoment {
  readonly fixtureId: FixtureId; readonly minute: number; readonly score: readonly [number, number];
  readonly prompt: string;
  readonly options: readonly { id: string; label: string; risk: "low" | "medium" | "high" }[];
}
export interface Honour {
  readonly id: string; readonly label: string; readonly kind: CompetitionKind;
  readonly contributionMinutes: number; readonly availableMinutes: number;
}
export interface IndividualAward {
  readonly id: string; readonly label: string;
  readonly scope: "club" | "league" | "continental" | "national-team" | "world";
}
export interface CareerArchive {
  readonly season: number; readonly age: number; readonly clubId: ClubId;
  readonly stats: SeasonStats; readonly overall: number; readonly marketValue: number;
  readonly competitionStats: readonly {
    readonly competitionId: string; readonly kind: CompetitionKind;
    readonly availableMinutes: number; readonly stats: SeasonStats;
  }[];
  readonly honours: readonly Honour[]; readonly awards: readonly IndividualAward[];
}
export interface SeasonState {
  readonly season: number; readonly status: "not-started" | "active" | "complete";
  readonly completedClubFixtures: number; readonly fixtures: readonly Fixture[];
  readonly results: readonly MatchResult[];
  readonly leagueTables: readonly { readonly leagueId: LeagueId; readonly rows: readonly LeagueTableRow[] }[];
  readonly domesticCupWinners: readonly ClubId[]; readonly continentalCupWinner: ClubId | null;
  readonly nationalTeamResult: {
    readonly selected: boolean; readonly appearances: number; readonly goals: number;
    readonly tournamentFinish: "not-held" | "group" | "runner-up" | "champion";
  };
  readonly pendingFixtureId: FixtureId | null;
}
export interface RngState { readonly seed: number; readonly cursor: number }
export interface CareerState {
  readonly saveSchemaVersion: 1; readonly rulesVersion: string; readonly rng: RngState;
  readonly phase: CareerPhase; readonly mode: GameMode; readonly difficulty: Difficulty;
  readonly trainingFocus: TrainingFocus; readonly careerIntent: CareerIntent; readonly world: World;
  readonly player: Player; readonly season: SeasonState; readonly archives: readonly CareerArchive[];
  readonly activeMoment: ActiveMoment | null; readonly activeEventId: EventId | null;
  readonly eventHistory: readonly { eventId: EventId; optionId: string; season: number; age: number }[];
  readonly careerHistory: readonly { type: string; season: number; age: number; summary: string }[];
  readonly commandHistory: readonly { index: number; command: GameCommand }[];
  readonly transferOffers: readonly TransferOffer[];
}
```

Backup snapshots belong to the persistence envelope rather than the pure career aggregate.

Define this command union without UI-specific fields:

```ts
export type GameCommand =
  | { type: "START_SEASON"; mode: GameMode; training: TrainingFocus; intent: CareerIntent }
  | { type: "ADVANCE_CLASSIC" }
  | { type: "START_NEXT_MATCH" }
  | { type: "CHOOSE_MOMENT"; optionId: string }
  | { type: "ACKNOWLEDGE_MATCH" }
  | { type: "CHOOSE_EVENT"; optionId: string }
  | { type: "CHOOSE_TRANSFER"; offerId: string | "stay" | "seek" }
  | { type: "START_NEXT_SEASON" };
```

Use a structured result rather than thrown business errors:

```ts
export type DomainErrorCode =
  | "INVALID_PHASE" | "INVALID_COMMAND" | "INVALID_OPTION"
  | "INVALID_STATE" | "NO_ELIGIBLE_EVENT" | "CAREER_COMPLETE";

export type GameResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: DomainErrorCode; message: string; path?: string } };
```

- [ ] **Step 4: Run tests and type checking**

Run: `pnpm test -- tests/unit/domain.test.ts && pnpm exec tsc --noEmit`

Expected: two passing tests and no TypeScript errors.

- [ ] **Step 5: Commit the domain contract**

```bash
git add src/game/domain tests/unit/domain.test.ts
git commit -m "feat: define career simulation domain"
```

### Task 3: Implement deterministic randomness and derived ratings

**Files:**
- Create: `src/game/engine/rng.ts`
- Create: `src/game/engine/ratings.ts`
- Create: `tests/unit/rng.test.ts`
- Create: `tests/property/rng.property.test.ts`

**Interfaces:**
- Consumes: `RngState`, `PositionFamily`, and player attributes from the domain files.
- Produces: `seedRng(seed: string)`, `nextFloat(state)`, `nextInt(state,min,max)`, `pickWeighted(state, items)`, and `calculateOverall(position, attributes)`.

- [ ] **Step 1: Write deterministic and range tests**

```ts
import { describe, expect, it } from "vitest";
import { nextFloat, nextInt, seedRng } from "@/game/engine/rng";

describe("deterministic RNG", () => {
  it("replays the same sequence from the same seed", () => {
    let a = seedRng("career-42");
    let b = seedRng("career-42");
    const left: number[] = [];
    const right: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const ar = nextFloat(a); a = ar.state; left.push(ar.value);
      const br = nextFloat(b); b = br.state; right.push(br.value);
    }
    expect(left).toEqual(right);
  });

  it("uses inclusive integer bounds", () => {
    let state = seedRng("bounds");
    for (let index = 0; index < 200; index += 1) {
      const result = nextInt(state, 3, 7); state = result.state;
      expect(result.value).toBeGreaterThanOrEqual(3);
      expect(result.value).toBeLessThanOrEqual(7);
    }
  });
});
```

- [ ] **Step 2: Verify the tests fail**

Run: `pnpm test -- tests/unit/rng.test.ts`

Expected: FAIL because `src/game/engine/rng.ts` does not exist.

- [ ] **Step 3: Implement an explicit cursor-based PRNG**

```ts
export interface RandomResult<T> { readonly value: T; readonly state: RngState }

const hashSeed = (text: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const seedRng = (seed: string): RngState => ({ seed: hashSeed(seed), cursor: 0 });

export const nextFloat = (state: RngState): RandomResult<number> => {
  let value = (state.seed + Math.imul(state.cursor + 1, 0x6d2b79f5)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const output = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  return { value: output, state: { ...state, cursor: state.cursor + 1 } };
};
```

Implement `nextInt` with inclusive bounds and rejection-free scaling, and `pickWeighted` with positive finite weights and an `INVALID_STATE` result when the list or total weight is invalid.

- [ ] **Step 4: Implement position-weighted OVR**

Use exact weights that sum to 1.0:

```ts
const weights = {
  goalkeeper: { technique: 0.25, awareness: 0.35, physical: 0.15, mentality: 0.25 },
  defender:   { technique: 0.15, awareness: 0.35, physical: 0.30, mentality: 0.20 },
  midfielder: { technique: 0.35, awareness: 0.30, physical: 0.15, mentality: 0.20 },
  forward:    { technique: 0.40, awareness: 0.20, physical: 0.25, mentality: 0.15 },
} as const;

export const calculateOverall = (position: PositionFamily, attributes: PlayerAttributes): number => {
  const current = weights[position];
  const value = Object.entries(current).reduce(
    (sum, [key, weight]) => sum + attributes[key as keyof PlayerAttributes] * weight,
    0,
  );
  return Math.round(value);
};
```

- [ ] **Step 5: Add a fast-check replay property**

```ts
import fc from "fast-check";
import { expect, it } from "vitest";
import { nextFloat, seedRng } from "@/game/engine/rng";

it("replays arbitrary seeds and sequence lengths", () => {
  fc.assert(fc.property(fc.string(), fc.integer({ min: 1, max: 200 }), (seed, length) => {
    const run = () => {
      let state = seedRng(seed);
      return Array.from({ length }, () => {
        const result = nextFloat(state); state = result.state; return result.value;
      });
    };
    expect(run()).toEqual(run());
  }));
});
```

- [ ] **Step 6: Verify and commit**

Run: `pnpm test -- tests/unit/rng.test.ts tests/property/rng.property.test.ts && pnpm exec tsc --noEmit`

Expected: all RNG tests pass and TypeScript exits 0.

```bash
git add src/game/engine/rng.ts src/game/engine/ratings.ts tests/unit/rng.test.ts tests/property/rng.property.test.ts
git commit -m "feat: add deterministic career randomness"
```

### Task 4: Build and validate the default fictional world

**Files:**
- Create: `src/game/world/schema.ts`
- Create: `src/game/world/default-world.ts`
- Create: `src/game/world/import-world.ts`
- Create: `tests/unit/world.test.ts`
- Create: `tests/unit/world-import.test.ts`

**Interfaces:**
- Consumes: `World`, `Country`, `League`, `Club`, branded IDs, `WORLD_SCHEMA_VERSION`.
- Produces: `createDefaultWorld(): World`, `parseWorldJson(text: string): WorldImportResult`, and `previewWorld(world: World): WorldPreview`.

- [ ] **Step 1: Write exact world-shape tests**

```ts
import { describe, expect, it } from "vitest";
import { createDefaultWorld } from "@/game/world/default-world";

describe("default fictional world", () => {
  it("contains four countries, eight leagues, and eighty unique clubs", () => {
    const world = createDefaultWorld();
    expect(world.countries).toHaveLength(4);
    expect(world.leagues).toHaveLength(8);
    expect(world.clubs).toHaveLength(80);
    expect(new Set(world.clubs.map((club) => club.id)).size).toBe(80);
  });

  it("contains two ten-club divisions per country", () => {
    const world = createDefaultWorld();
    for (const country of world.countries) {
      const leagues = world.leagues.filter((league) => league.countryId === country.id);
      expect(leagues.map((league) => league.level).sort()).toEqual([1, 2]);
      for (const league of leagues) {
        expect(world.clubs.filter((club) => club.leagueId === league.id)).toHaveLength(10);
      }
    }
  });
});
```

- [ ] **Step 2: Verify world tests fail**

Run: `pnpm test -- tests/unit/world.test.ts`

Expected: FAIL because the world modules do not exist.

- [ ] **Step 3: Define the strict Zod schema**

Use `z.strictObject` at every persisted object boundary. Enforce kebab-case IDs, names from 1–60 characters without control characters, level 1 or 2, and all strength/facility/reputation values as integers from 1–100. Add a `superRefine` pass that enforces four countries, two leagues at levels 1 and 2 per country, ten clubs per league, globally unique IDs, and valid references.

```ts
export const clubSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(60).regex(/^[^\u0000-\u001f\u007f]+$/),
  countryId: z.string(),
  leagueId: z.string(),
  reputation: z.number().int().min(1).max(100),
  finances: z.number().int().min(1).max(100),
  academy: z.number().int().min(1).max(100),
  facilities: z.number().int().min(1).max(100),
  lines: z.strictObject({
    goalkeeper: z.number().int().min(1).max(100),
    defender: z.number().int().min(1).max(100),
    midfielder: z.number().int().min(1).max(100),
    forward: z.number().int().min(1).max(100),
  }),
  style: z.enum(["balanced", "pressing", "counter", "possession", "direct"]),
  homeAdvantage: z.number().int().min(0).max(10),
});
```

- [ ] **Step 4: Generate exactly eighty original clubs from explicit country seeds**

Use these country names and twenty original location names per country; division one uses indexes 0–9 and division two uses 10–19:

```ts
const countrySeeds = [
  { id: "northland", name: "Northland", locations: [
    "Aster Vale", "Ironford", "Greyhaven", "Morrow Bay", "Highmere",
    "Stonewick", "Cedar Crown", "Brindle", "Foxbridge", "Northwatch",
    "Elmstead", "Rookport", "Frostmere", "Dunmarsh", "Oakcross",
    "Raven Fell", "Whitecliff", "Briar Gate", "Kestrel", "Westbarrow",
  ] },
  { id: "solaria", name: "Solaria", locations: [
    "Luz Marina", "Costa Dorada", "Valmora", "Sierra Azul", "Puerto Alba",
    "Rio Claro", "Monteluz", "San Vero", "Cobre Vista", "Isla Verde",
    "Campo Rojo", "Nueva Estrella", "Bahia Sur", "Piedra Sol", "Las Palmas",
    "Miraflor", "Torrenube", "Prado Alto", "Vela Cruz", "Arena Blanca",
  ] },
  { id: "verdancia", name: "Verdancia", locations: [
    "Greenwall", "Lake Ember", "Willow City", "Pine Harbour", "Meadowgate",
    "Brookfield", "Ashbourne", "Holloway", "Mossley", "Riverglass",
    "Fernhill", "Maple Junction", "Orchard Row", "Woodmere", "Claybank",
    "Roseford", "Birch Point", "Thistle End", "Hazelton", "Millgrove",
  ] },
  { id: "eastria", name: "Eastria", locations: [
    "Akebono", "Jade Harbour", "Sun Crane", "Lotus Gate", "Silver Pagoda",
    "Red Maple", "Moonbridge", "Cloud Peak", "Pearl River", "Golden Field",
    "Bamboo Coast", "Morning Bell", "Pine Lantern", "Azure Steppe", "Plum City",
    "Quiet Bay", "Sky Temple", "Amber Road", "Snow Blossom", "Eastwind",
  ] },
] as const;
```

Create stable IDs from the country ID plus slugified location. Assign original club names as `${location} Athletic` for division one and `${location} Union` for division two. Use this exact deterministic value generator:

```ts
const clampRating = (value: number) => Math.max(1, Math.min(100, Math.round(value)));
const styles = ["balanced", "pressing", "counter", "possession", "direct"] as const;

const makeClub = (countryIndex: number, country: CountrySeed, location: string, index: number): Club => {
  const level = index < 10 ? 1 : 2;
  const withinDivision = index % 10;
  const base = (level === 1 ? 76 : 58) - withinDivision * 2 + countryIndex;
  const slug = location.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    id: clubId(`${country.id}-${slug}`),
    name: `${location} ${level === 1 ? "Athletic" : "Union"}`,
    countryId: countryId(country.id),
    leagueId: leagueId(`${country.id}-${level}`),
    reputation: clampRating(base + 4),
    finances: clampRating(base + (withinDivision % 3) * 2),
    academy: clampRating(base - 3 + ((withinDivision + countryIndex) % 5) * 3),
    facilities: clampRating(base),
    lines: {
      goalkeeper: clampRating(base + ((withinDivision + 1) % 4) - 2),
      defender: clampRating(base + ((withinDivision + 2) % 5) - 2),
      midfielder: clampRating(base + ((withinDivision + 3) % 5) - 2),
      forward: clampRating(base + ((withinDivision + 4) % 5) - 2),
    },
    style: styles[(withinDivision + countryIndex) % styles.length]!,
    homeAdvantage: 3 + ((withinDivision + countryIndex) % 4),
  };
};
```

- [ ] **Step 5: Test safe import failures**

```ts
it("reports a field path and never returns a partial world", () => {
  const invalid = JSON.stringify({ ...createDefaultWorld(), clubs: [] });
  const result = parseWorldJson(invalid);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.issues[0]?.path).toContain("clubs");
});

it("returns a count preview for valid JSON", () => {
  const result = parseWorldJson(JSON.stringify(createDefaultWorld()));
  expect(result).toMatchObject({
    ok: true,
    preview: { countryCount: 4, leagueCount: 8, clubCount: 80 },
  });
});
```

- [ ] **Step 6: Verify and commit**

Run: `pnpm test -- tests/unit/world.test.ts tests/unit/world-import.test.ts && pnpm exec tsc --noEmit`

Expected: all world and import tests pass.

```bash
git add src/game/world tests/unit/world.test.ts tests/unit/world-import.test.ts
git commit -m "feat: add original fictional football world"
```

### Task 5: Generate league and knockout schedules and maintain tables

**Files:**
- Create: `src/game/engine/schedule.ts`
- Create: `src/game/engine/table.ts`
- Create: `tests/unit/schedule.test.ts`
- Create: `tests/property/schedule.property.test.ts`

**Interfaces:**
- Consumes: `ClubId`, `FixtureId`, `Fixture`, `LeagueTableRow`, `MatchResult`, `CompetitionKind`.
- Produces: `createDoubleRoundRobin(leagueId, clubIds, season)`, `createKnockoutRound(competitionId, entrants, round, rng)`, `createEmptyTable(clubs)`, `applyLeagueResult(table, result)`, and `sortTable(table)`.

- [ ] **Step 1: Write league schedule tests**

```ts
import { describe, expect, it } from "vitest";
import { clubId, leagueId } from "@/game/domain/ids";
import { createDoubleRoundRobin } from "@/game/engine/schedule";

describe("double round-robin schedule", () => {
  it("creates 18 rounds and 90 fixtures for ten clubs", () => {
    const clubs = Array.from({ length: 10 }, (_, index) => clubId(`club-${index + 1}`));
    const fixtures = createDoubleRoundRobin(leagueId("league-1"), clubs, 2026);
    expect(new Set(fixtures.map((fixture) => fixture.round)).size).toBe(18);
    expect(fixtures).toHaveLength(90);
    expect(fixtures.every((fixture) => fixture.homeClubId !== fixture.awayClubId)).toBe(true);
  });

  it("schedules every ordered pairing exactly once", () => {
    const clubs = Array.from({ length: 10 }, (_, index) => clubId(`club-${index + 1}`));
    const fixtures = createDoubleRoundRobin(leagueId("league-1"), clubs, 2026);
    const pairs = fixtures.map((fixture) => `${fixture.homeClubId}:${fixture.awayClubId}`);
    expect(new Set(pairs).size).toBe(90);
  });
});
```

- [ ] **Step 2: Run schedule tests and verify failure**

Run: `pnpm test -- tests/unit/schedule.test.ts`

Expected: FAIL because `schedule.ts` does not exist.

- [ ] **Step 3: Implement the circle algorithm with stable fixture IDs**

```ts
export const createDoubleRoundRobin = (
  league: LeagueId,
  entrants: readonly ClubId[],
  season: number,
): Fixture[] => {
  if (entrants.length !== 10 || new Set(entrants).size !== 10) {
    throw new Error("A league schedule requires ten unique clubs");
  }
  const rotation = [...entrants];
  const firstHalf: Fixture[] = [];
  for (let round = 1; round <= 9; round += 1) {
    for (let index = 0; index < 5; index += 1) {
      const left = rotation[index]!;
      const right = rotation[9 - index]!;
      const home = round % 2 === 0 ? right : left;
      const away = round % 2 === 0 ? left : right;
      firstHalf.push(makeLeagueFixture(league, season, round, index, home, away));
    }
    rotation.splice(1, 0, rotation.pop()!);
  }
  const secondHalf = firstHalf.map((fixture) => ({
    ...fixture,
    id: fixtureId(`${fixture.id}-return`),
    round: fixture.round + 9,
    homeClubId: fixture.awayClubId,
    awayClubId: fixture.homeClubId,
  }));
  return [...firstHalf, ...secondHalf];
};

const makeLeagueFixture = (
  league: LeagueId, season: number, round: number, index: number,
  homeClubId: ClubId, awayClubId: ClubId,
): Fixture => ({
  id: fixtureId(`${league}-${season}-${round}-${index}`),
  competitionId: league,
  kind: "league",
  season,
  round,
  homeClubId,
  awayClubId,
  status: "scheduled",
});
```

- [ ] **Step 4: Write and implement table accounting tests**

```ts
const result = (home: string, away: string, homeGoals: number, awayGoals: number): MatchResult => ({
  fixtureId: fixtureId(`${home}-${away}`),
  homeClubId: clubId(home), awayClubId: clubId(away), homeGoals, awayGoals,
  playerPerformance: null, timeline: [],
});
const row = (table: readonly LeagueTableRow[], id: string) =>
  table.find((entry) => entry.clubId === clubId(id));

it("awards three points for a win and one for a draw", () => {
  const table = createEmptyTable([clubId("home"), clubId("away")]);
  const afterWin = applyLeagueResult(table, result("home", "away", 2, 0));
  expect(row(afterWin, "home")).toMatchObject({ played: 1, won: 1, points: 3, goalsFor: 2 });
  expect(row(afterWin, "away")).toMatchObject({ played: 1, lost: 1, points: 0, goalsAgainst: 2 });
});
```

Sort by points, goal difference, goals scored, wins, then stable club ID. Do not add head-to-head logic in the MVP.

- [ ] **Step 5: Add property tests for schedule and points invariants**

For every permutation of ten unique generated club IDs, assert 90 fixtures, 18 matches per club, nine home and nine away matches per club, no self-match, and 90 unique ordered pairs. For arbitrary valid score pairs, assert total awarded points are 2 for a draw and 3 otherwise.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test -- tests/unit/schedule.test.ts tests/property/schedule.property.test.ts`

Expected: all schedule and table invariants pass.

```bash
git add src/game/engine/schedule.ts src/game/engine/table.ts tests/unit/schedule.test.ts tests/property/schedule.property.test.ts
git commit -m "feat: schedule fictional football competitions"
```

### Task 6: Build the common match engine and detailed key moments

**Files:**
- Create: `src/game/engine/match.ts`
- Create: `src/game/engine/moments.ts`
- Create: `tests/unit/match.test.ts`
- Create: `tests/unit/moments.test.ts`
- Create: `tests/property/match.property.test.ts`

**Interfaces:**
- Consumes: `Fixture`, `World`, `Player`, `RngState`, `PositionFamily`, `MatchResult`.
- Produces: `prepareMatch(context)`, `simulateMatch(context)`, `createMoment(context)`, and `resolveMoment(context, optionId)`.

- [ ] **Step 1: Write a deterministic match test**

```ts
it("produces the same result and cursor from identical inputs", () => {
  const context = matchContext({ seed: "match-11", playerClub: "northland-aster-vale" });
  expect(simulateMatch(context)).toEqual(simulateMatch(context));
});

it("returns non-negative integer scores and a bounded player rating", () => {
  const result = simulateMatch(matchContext({ seed: "valid-scores" }));
  expect(Number.isInteger(result.result.homeGoals)).toBe(true);
  expect(Number.isInteger(result.result.awayGoals)).toBe(true);
  expect(result.result.homeGoals).toBeGreaterThanOrEqual(0);
  expect(result.result.playerPerformance?.rating ?? 6).toBeGreaterThanOrEqual(1);
  expect(result.result.playerPerformance?.rating ?? 6).toBeLessThanOrEqual(10);
});
```

- [ ] **Step 2: Verify match tests fail**

Run: `pnpm test -- tests/unit/match.test.ts`

Expected: FAIL because `match.ts` does not exist.

- [ ] **Step 3: Implement shared expected-goals resolution**

Calculate each side's attack value from forward 40%, midfield 25%, opposing defence inverse 25%, form 5%, and home advantage 5%. Convert the rating difference to xG with `clamp(0.25, 3.4, 1.25 + difference / 35)`. Sample goals by accumulating six independent Bernoulli trials whose probabilities sum to the xG target, capped at six goals. Detailed mode must use the same baseline result before player moments modify it.

```ts
const clamp = (min: number, max: number, value: number) => Math.max(min, Math.min(max, value));

const sampleGoals = (rng: RngState, expectedGoals: number) => {
  let state = rng;
  let goals = 0;
  const chance = clamp(0.02, 0.55, expectedGoals / 6);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const draw = nextFloat(state); state = draw.state;
    if (draw.value < chance) goals += 1;
  }
  return { goals, state };
};
```

Player selection probability comes from promised role, coach trust, fitness, injury, and OVR versus the club's relevant line. Record starts, substitute appearances, minutes, rating, cards, goals, assists, saves, and clean sheets by position.

- [ ] **Step 4: Define the complete moment option catalog**

```ts
export const momentOptions = {
  goalkeeper: [
    { id: "rush", label: "Rush out", risk: "high", skill: "awareness" },
    { id: "hold-line", label: "Hold the line", risk: "low", skill: "mentality" },
    { id: "quick-release", label: "Start a quick counter", risk: "medium", skill: "technique" },
    { id: "slow-play", label: "Slow the tempo", risk: "low", skill: "mentality" },
  ],
  defender: [
    { id: "step-out", label: "Step out to challenge", risk: "high", skill: "physical" },
    { id: "block-lane", label: "Block the passing lane", risk: "medium", skill: "awareness" },
    { id: "hold-shape", label: "Hold the defensive shape", risk: "low", skill: "mentality" },
    { id: "attack-set-piece", label: "Attack the set piece", risk: "medium", skill: "physical" },
  ],
  midfielder: [
    { id: "through-ball", label: "Attempt the through ball", risk: "high", skill: "technique" },
    { id: "retain", label: "Retain possession", risk: "low", skill: "awareness" },
    { id: "long-shot", label: "Shoot from distance", risk: "high", skill: "technique" },
    { id: "tactical-foul", label: "Stop the counter", risk: "medium", skill: "mentality" },
  ],
  forward: [
    { id: "first-time", label: "Shoot first time", risk: "high", skill: "technique" },
    { id: "settle", label: "Take a touch", risk: "medium", skill: "mentality" },
    { id: "square-pass", label: "Square the ball", risk: "low", skill: "awareness" },
    { id: "draw-foul", label: "Shield and draw contact", risk: "medium", skill: "physical" },
  ],
} as const;
```

Generate zero moments when the player does not appear and zero to three otherwise. Resolve success against a threshold derived from the selected skill, fitness, form, opponent line, match state, and risk. Return updated score, performance, timeline, and RNG cursor without mutating the input.

- [ ] **Step 5: Test position filtering and invalid choices**

Assert that a forward never receives goalkeeper options, a benched player receives no moment, and an option not in the active moment returns `INVALID_OPTION` without moving the RNG cursor.

- [ ] **Step 6: Add match property tests**

Across 1,000 generated club-strength/player-condition combinations, assert integer scores from 0–6, ratings from 1–10, minutes from 0–120, no player goal when minutes are zero, and deterministic replay.

- [ ] **Step 7: Verify and commit**

Run: `pnpm test -- tests/unit/match.test.ts tests/unit/moments.test.ts tests/property/match.property.test.ts`

Expected: all common match and detailed-moment tests pass.

```bash
git add src/game/engine/match.ts src/game/engine/moments.ts tests/unit/match.test.ts tests/unit/moments.test.ts tests/property/match.property.test.ts
git commit -m "feat: simulate matches and player moments"
```

### Task 7: Implement growth, training, ageing, injuries, and recovery

**Files:**
- Create: `src/game/engine/progression.ts`
- Create: `src/game/engine/injuries.ts`
- Create: `tests/unit/progression.test.ts`
- Create: `tests/unit/injuries.test.ts`

**Interfaces:**
- Consumes: `Player`, `TrainingFocus`, season minutes/ratings, club facilities, `RngState`.
- Produces: `applySeasonProgression(input)`, `rollMatchInjury(input)`, `advanceInjuryRecovery(player)`, and `trainingEffect(focus, player)`.

- [ ] **Step 1: Write age-curve tests**

```ts
it("grows a high-potential 18-year-old starter faster than a benched peer", () => {
  const starter = applySeasonProgression(progressionInput({ age: 18, minutes: 2400, potential: 88 }));
  const bench = applySeasonProgression(progressionInput({ age: 18, minutes: 180, potential: 88 }));
  expect(starter.player.overall).toBeGreaterThan(bench.player.overall);
});

it("declines physical ability after age 33 while allowing mentality to hold", () => {
  const result = applySeasonProgression(progressionInput({ age: 34, physical: 82, mentality: 76 }));
  expect(result.player.attributes.physical).toBeLessThan(82);
  expect(result.player.attributes.mentality).toBeGreaterThanOrEqual(75);
});
```

- [ ] **Step 2: Verify progression tests fail**

Run: `pnpm test -- tests/unit/progression.test.ts tests/unit/injuries.test.ts`

Expected: FAIL because progression and injury modules do not exist.

- [ ] **Step 3: Implement exact age multipliers and caps**

```ts
const ageGrowthMultiplier = (age: number): number => {
  if (age <= 21) return 1;
  if (age <= 28) return 0.45;
  if (age <= 32) return 0.05;
  return -0.55;
};

const minutesMultiplier = (minutes: number): number => {
  if (minutes >= 2400) return 1;
  if (minutes >= 1400) return 0.75;
  if (minutes >= 600) return 0.4;
  return 0.1;
};
```

Calculate a base seasonal delta from age multiplier, minutes multiplier, potential gap, average rating, facilities, and training focus. Clamp every attribute to 1–99 and never allow OVR to exceed potential by more than two points. At ages 33–36, apply physical decline before positive training effects.

- [ ] **Step 4: Implement injury risk and recovery**

Use four severities: knock (1 match), strain (2–4), fracture (5–10), and major (11–24). Base per-appearance risk is 1.8%, multiplied by low fitness, age over 31, physical ability below 55, and recent workload. Major injuries apply a deterministic recovery outcome that can reduce potential by 0–2 and physical ability by 0–3.

```ts
export const advanceInjuryRecovery = (player: Player): Player => {
  if (!player.injury) return player;
  const remainingMatches = player.injury.remainingMatches - 1;
  return remainingMatches <= 0
    ? { ...player, injury: null, fitness: Math.max(player.fitness, 55) }
    : { ...player, injury: { ...player.injury, remainingMatches } };
};
```

- [ ] **Step 5: Verify deterministic progression and commit**

Run: `pnpm test -- tests/unit/progression.test.ts tests/unit/injuries.test.ts && pnpm exec tsc --noEmit`

Expected: progression and injury tests pass.

```bash
git add src/game/engine/progression.ts src/game/engine/injuries.ts tests/unit/progression.test.ts tests/unit/injuries.test.ts
git commit -m "feat: model player growth and injuries"
```

### Task 8: Orchestrate leagues, cups, promotion, continental play, and national teams

**Files:**
- Create: `src/game/engine/season.ts`
- Create: `src/game/engine/competitions.ts`
- Create: `tests/integration/season.test.ts`
- Create: `tests/property/season.property.test.ts`

**Interfaces:**
- Consumes: schedules, tables, match simulation, world, player, RNG.
- Produces: `createSeasonState(world, seasonNumber, rng)`, `advanceCompetitionRound(state)`, `finalizeSeason(state)`, and `selectNationalTeam(player, seasonContext)`.

- [ ] **Step 1: Write a complete-season invariant test**

```ts
it("finishes all eight leagues, four domestic cups, and one continental cup", () => {
  const initial = createSeasonState(createDefaultWorld(), 1, seedRng("season-one"));
  const completed = runSeasonToCompletion(initial);
  expect(completed.status).toBe("complete");
  expect(completed.leagueTables).toHaveLength(8);
  expect(completed.domesticCupWinners).toHaveLength(4);
  expect(completed.continentalCupWinner).toBeTruthy();
  expect(completed.leagueTables.every((table) => table.rows.every((row) => row.played === 18))).toBe(true);
});
```

- [ ] **Step 2: Verify the season test fails**

Run: `pnpm test -- tests/integration/season.test.ts`

Expected: FAIL because the season orchestrator does not exist.

- [ ] **Step 3: Implement competition state machines**

Use the following fixed formats:

- Domestic cup: all 20 clubs enter. The eight lowest-reputation clubs play a preliminary round; its four winners join the twelve seeded clubs in the round of 16.
- Continental cup: top four from each first division; four groups of four, double round robin; top two enter quarter-finals, then two-leg quarter-finals and semi-finals, single-match final.
- National teams: a player becomes eligible at OVR 68; selection probability rises with OVR, form, minutes, and reputation. Every fourth season runs a four-team national tournament with round robin plus final.

The preliminary-round seeding order is reputation descending with club ID as the stable tiebreaker; the lowest eight play, and the highest twelve receive byes.

- [ ] **Step 4: Implement promotion and relegation atomically**

For each country, move first-division positions 9–10 to division two and second-division positions 1–2 to division one in one immutable world update. Preserve club IDs and update only league IDs and levels. Verify each league still has ten clubs before accepting the new world.

- [ ] **Step 5: Add season property tests**

Across 100 seeds, assert eight 10-team final tables, 18 matches per club, four domestic champions, one continental champion, exactly two promotions and relegations per country, and no club in two leagues simultaneously.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test -- tests/integration/season.test.ts tests/property/season.property.test.ts`

Expected: all competition and season invariants pass.

```bash
git add src/game/engine/season.ts src/game/engine/competitions.ts tests/integration/season.test.ts tests/property/season.property.test.ts
git commit -m "feat: orchestrate fictional football seasons"
```

### Task 9: Implement contracts, club roles, loans, and transfer offers

**Files:**
- Create: `src/game/engine/transfers.ts`
- Create: `tests/unit/transfers.test.ts`
- Create: `tests/property/transfers.property.test.ts`

**Interfaces:**
- Consumes: `Player`, `Club`, `World`, season performance, career intent, `RngState`.
- Produces: `estimateClubRole(player, club)`, `generateTransferOffers(input)`, `acceptTransfer(player, offer)`, `renewContract(player, club, rng)`, and `requestLoan(input)`.

- [ ] **Step 1: Write role and offer tests**

```ts
it("offers a starter role when player OVR exceeds the club line", () => {
  const role = estimateClubRole(player({ overall: 78, position: "midfielder" }), club({ midfielder: 70 }));
  expect(role).toBe("starter");
});

it("does not offer clubs that cannot afford the player or already employ them", () => {
  const offers = generateTransferOffers(transferInput({ currentClubId: "aster", marketValue: 90_000_000 }));
  expect(offers.every((offer) => offer.clubId !== clubId("aster"))).toBe(true);
  expect(offers.every((offer) => offer.financialFit >= 1)).toBe(true);
});
```

- [ ] **Step 2: Verify transfer tests fail**

Run: `pnpm test -- tests/unit/transfers.test.ts`

Expected: FAIL because `transfers.ts` does not exist.

- [ ] **Step 3: Implement exact role and contract rules**

```ts
export type SquadRole = "prospect" | "rotation" | "starter" | "star";

export const estimateClubRole = (player: Player, club: Club): SquadRole => {
  const line = club.lines[player.position];
  const difference = player.overall - line;
  if (difference >= 10) return "star";
  if (difference >= 2) return "starter";
  if (difference >= -6) return "rotation";
  return "prospect";
};
```

Set contract length to 1–5 years, weekly wage from club finances and player market value, and appearance/title bonuses as integer currency values. Contract and offer IDs must derive from season, club ID, player ID, and RNG cursor.

- [ ] **Step 4: Implement weighted offer generation**

Filter out the current club, unaffordable clubs, clubs more than 22 OVR above the player line, and clubs whose role need is incompatible. Weight remaining clubs by reputation fit, likely role, country change preference, current intent, recent form, and competition level. Return 0–5 unique offers. If no external offer exists, always include a valid `stay` decision; never force an invalid transfer.

- [ ] **Step 5: Implement young-player loans**

Allow loans only for ages 16–23, contract years remaining at least two, and current role `prospect` or `rotation`. Loans last one season, preserve the parent contract, and require the destination to promise `starter` or `rotation`.

- [ ] **Step 6: Add transfer property tests**

Across generated valid players and worlds, assert unique offer clubs, legal contract years, non-negative integer wages, no current-club transfer, accepted offers change the club exactly once, and replay from identical RNG state is equal.

- [ ] **Step 7: Verify and commit**

Run: `pnpm test -- tests/unit/transfers.test.ts tests/property/transfers.property.test.ts`

Expected: all transfer and contract tests pass.

```bash
git add src/game/engine/transfers.ts tests/unit/transfers.test.ts tests/property/transfers.property.test.ts
git commit -m "feat: add contracts loans and transfers"
```

### Task 10: Add the original 72-event career catalog

**Files:**
- Create: `src/game/events/types.ts`
- Create: `src/game/events/catalog/training.ts`
- Create: `src/game/events/catalog/recovery.ts`
- Create: `src/game/events/catalog/coach.ts`
- Create: `src/game/events/catalog/teammates.ts`
- Create: `src/game/events/catalog/media.ts`
- Create: `src/game/events/catalog/family.ts`
- Create: `src/game/events/catalog/agent.ts`
- Create: `src/game/events/catalog/national-team.ts`
- Create: `src/game/events/catalog/contracts.ts`
- Create: `src/game/events/catalog/milestones.ts`
- Create: `src/game/events/catalog/index.ts`
- Create: `src/game/events/select-event.ts`
- Create: `src/game/events/apply-event-choice.ts`
- Create: `tests/unit/events.test.ts`

**Interfaces:**
- Consumes: `CareerState`, `Player`, `RngState`, `EventId`.
- Produces: `CareerEvent`, `eventCatalog`, `eligibleEvents(state)`, `selectEvent(state)`, and `applyEventChoice(state, eventId, optionId)`.

- [ ] **Step 1: Define and test the catalog contract**

```ts
it("contains at least 72 unique original events across all ten categories", () => {
  expect(eventCatalog.length).toBeGreaterThanOrEqual(72);
  expect(new Set(eventCatalog.map((event) => event.id)).size).toBe(eventCatalog.length);
  expect(new Set(eventCatalog.map((event) => event.category))).toEqual(new Set([
    "training", "recovery", "coach", "teammates", "media",
    "family", "agent", "national-team", "contracts", "milestones",
  ]));
});

it("every event has two or three unique options and a positive max trigger count", () => {
  for (const event of eventCatalog) {
    expect(event.options.length).toBeGreaterThanOrEqual(2);
    expect(event.options.length).toBeLessThanOrEqual(3);
    expect(new Set(event.options.map((option) => option.id)).size).toBe(event.options.length);
    expect(event.maxTriggers).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Verify the catalog test fails**

Run: `pnpm test -- tests/unit/events.test.ts`

Expected: FAIL because the event catalog does not exist.

- [ ] **Step 3: Implement the event type and effect vocabulary**

```ts
export type EventCategory =
  | "training" | "recovery" | "coach" | "teammates" | "media"
  | "family" | "agent" | "national-team" | "contracts" | "milestones";

export type EventEffect =
  | { type: "ATTRIBUTE"; attribute: keyof PlayerAttributes; delta: number }
  | { type: "CONDITION"; field: "fitness" | "form" | "morale" | "coachTrust"; delta: number }
  | { type: "REPUTATION"; delta: number }
  | { type: "MARKET_VALUE_PERCENT"; percent: number }
  | { type: "INJURY_RISK"; matches: number; multiplier: number }
  | { type: "TAG"; tag: string }
  | { type: "TRANSFER_INTENT"; value: boolean };

export interface CareerEvent {
  readonly id: EventId;
  readonly category: EventCategory;
  readonly title: string;
  readonly body: string;
  readonly positions?: readonly PositionFamily[];
  readonly minAge?: number;
  readonly maxAge?: number;
  readonly requiredTags?: readonly string[];
  readonly excludedTags?: readonly string[];
  readonly cooldownSeasons: number;
  readonly maxTriggers: number;
  readonly weight: number;
  readonly options: readonly {
    id: string;
    label: string;
    effects: readonly EventEffect[];
  }[];
}
```

- [ ] **Step 4: Populate the ten category files with exact counts**

Create 8 training, 7 recovery, 8 coach, 8 teammates, 8 media, 6 family, 7 agent, 7 national-team, 7 contracts, and 6 milestones events, totaling 72. Use these exact stable titles as the catalog checklist:

| Category | Event titles |
|---|---|
| Training | Extra Repetitions; New Position Drill; Weaker Foot Week; Recovery or Work; Video Study; Sprint Block; Set-Piece Duty; Academy Demonstration |
| Recovery | Tight Hamstring; Cold Morning Session; Return Ahead of Schedule; Specialist Consultation; Confidence After Injury; Protected Training; Final Fitness Test |
| Coach | Earn the Shirt; Tactical Responsibility; Public Challenge; Quiet Warning; Captain's Example; New System; Rotation Promise; Training Ground Dispute |
| Teammates | New Roommate; Senior Advice; Dressing-Room Vote; Assist Bonus; Training Collision; Young Prospect; Team Dinner; Derby Message |
| Media | Breakout Headline; Difficult Interview; Transfer Rumour; Social-Media Slip; Player of the Month; Goal Drought Questions; National Spotlight; Retirement Speculation |
| Family | Long-Distance Choice; Home-Town Visit; New Responsibility; Family at the Final; Private Celebration; Life After Football |
| Agent | First Representation; Better Commission; Release Clause; Overseas Call; Sponsor Offer; Change of Agent; Deadline Pressure |
| National team | First Call-Up; Debut Nerves; International Role; Tournament Camp; Captain's Armband; Club or Country; Final Tournament |
| Contracts | First Professional Deal; Extension Talks; Wage or Role; Loyalty Offer; Pay Cut Request; Free-Agent Winter; Final Contract |
| Milestones | First Goal; Hundred Appearances; Club Record; Continental Night; Testimonial Match; Farewell Speech |

Each event must contain original body copy of 1–3 sentences and two or three choices whose effects use only the defined vocabulary. No option may grant more than +3 to one attribute, +12 to one condition, +8 reputation, or ±20% market value.

- [ ] **Step 5: Implement eligibility, cooldown, and weighted selection**

Filter by age, position, tags, trigger count, cooldown, injury/contract/national-team facts encoded by the event. At classic checkpoints, select one eligible event. In detailed mode, check every four completed club fixtures plus midseason and season end. If no event is eligible, return `NO_ELIGIBLE_EVENT` and let the orchestrator continue without an event.

- [ ] **Step 6: Implement immutable choice effects and bounds**

Apply effects in listed order; clamp attributes to 1–99, condition to 0–100, reputation to 0–100, and market value to a non-negative integer. Record event ID, option ID, season, age, and effects in career history. Reject invalid event/option pairs without changing state or RNG.

- [ ] **Step 7: Verify and commit**

Run: `pnpm test -- tests/unit/events.test.ts && pnpm exec tsc --noEmit`

Expected: catalog count, uniqueness, eligibility, cooldown, replay, and bounds tests pass.

```bash
git add src/game/events tests/unit/events.test.ts
git commit -m "feat: add original career event catalog"
```

### Task 11: Create career initialization and the pure command state machine

**Files:**
- Create: `src/game/application/create-career.ts`
- Create: `src/game/application/dispatch-command.ts`
- Create: `src/game/application/auto-strategy.ts`
- Create: `tests/unit/create-career.test.ts`
- Create: `tests/integration/classic-career.test.ts`
- Create: `tests/integration/detailed-career.test.ts`

**Interfaces:**
- Consumes: all domain contracts, world, match, moment, season, event, progression, injury, and transfer functions.
- Produces: `CreateCareerInput`, `createCareer(input): GameResult<CareerState>`, `dispatchCommand(state, command): GameResult<CareerState>`, and `chooseDeterministicDefault(state): GameCommand`.

- [ ] **Step 1: Write creation validation tests**

```ts
it("creates a 16-year-old career in preseason with a stable seed", () => {
  const result = createCareer(validCreateInput({ seed: "my-career", mode: "classic" }));
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.player.age).toBe(16);
    expect(result.value.phase).toBe("preseason");
    expect(result.value.rng).toEqual(seedRng("my-career"));
  }
});

it("rejects blank names and a starting club outside the world", () => {
  expect(createCareer(validCreateInput({ playerName: "" })).ok).toBe(false);
  expect(createCareer(validCreateInput({ startingClubId: clubId("missing") })).ok).toBe(false);
});
```

- [ ] **Step 2: Verify creation tests fail**

Run: `pnpm test -- tests/unit/create-career.test.ts`

Expected: FAIL because career application modules do not exist.

- [ ] **Step 3: Implement initial player and state creation**

```ts
export interface CreateCareerInput {
  readonly world: World;
  readonly playerName: string;
  readonly nationality: CountryId;
  readonly position: PositionFamily;
  readonly preferredFoot: "left" | "right";
  readonly shirtNumber: number;
  readonly difficulty: Difficulty;
  readonly seed: string;
  readonly startingClubId: ClubId;
  readonly mode: GameMode;
  readonly trainingFocus: TrainingFocus;
  readonly careerIntent: CareerIntent;
}
```

Initial attributes derive from position, difficulty, starting club, and RNG within 45–62; potential is 70–92. Set fitness, morale, form, and coach trust to bounded starting values, create a two-year prospect contract, and write one `CAREER_CREATED` history entry. Validate name length 1–40, shirt 1–99, supported nationality, and club reference before consuming RNG.

- [ ] **Step 4: Implement exact phase/command transitions**

```ts
const allowedCommands: Record<CareerPhase, readonly GameCommand["type"][]> = {
  preseason: ["START_SEASON"],
  "classic-checkpoint": ["ADVANCE_CLASSIC", "CHOOSE_EVENT"],
  "detailed-prematch": ["START_NEXT_MATCH", "CHOOSE_EVENT"],
  "detailed-moment": ["CHOOSE_MOMENT"],
  "detailed-postmatch": ["ACKNOWLEDGE_MATCH", "CHOOSE_EVENT"],
  "season-review": ["CHOOSE_TRANSFER"],
  "transfer-window": ["CHOOSE_TRANSFER", "START_NEXT_SEASON"],
  retired: [],
};
```

`START_SEASON` can change mode only from `preseason`. Classic advancement stops at an event or season review. Detailed advancement stops at a moment, post-match report, event, or season review. Every accepted command appends a canonical command record; rejected commands leave the state byte-for-byte equal.

Classic mode uses five event checkpoints after the player's club has completed 4, 8, 12, and 16 fixtures and at season completion. A checkpoint with no eligible event immediately continues; otherwise it pauses for `CHOOSE_EVENT`. This guarantees four to six checks per season without changing match rules.

- [ ] **Step 5: Implement age and retirement boundaries**

At the end of each season, archive all statistics before incrementing age. Ages 16 through 36 each receive one season. After archiving the age-36 season, set phase to `retired`; do not generate offers or a season 22.

- [ ] **Step 6: Implement deterministic automatic strategy**

The test strategy chooses technique training, steady growth, the first event option, the lowest-risk active moment, the first starter-role offer whose reputation exceeds the current club, otherwise stay, and acknowledges reports immediately. It may not inspect future RNG values.

- [ ] **Step 7: Run full classic and detailed career tests**

```ts
it("completes exactly 21 archived seasons in classic mode", () => {
  const final = runCareerToRetirement(createClassicCareer("classic-21"));
  expect(final.phase).toBe("retired");
  expect(final.archives).toHaveLength(21);
  expect(final.archives.map((archive) => archive.age)).toEqual(
    Array.from({ length: 21 }, (_, index) => index + 16),
  );
});

it("can pause and replay a detailed moment", () => {
  const paused = runUntilMoment(createDetailedCareer("moment-pause"));
  const option = paused.activeMoment!.options[0]!.id;
  expect(dispatchCommand(paused, { type: "CHOOSE_MOMENT", optionId: option }))
    .toEqual(dispatchCommand(paused, { type: "CHOOSE_MOMENT", optionId: option }));
});

it("resolves one classic season in less than one second on the test host", () => {
  const initial = createClassicCareer("classic-performance");
  const startedAt = performance.now();
  runOneClassicSeason(initial);
  expect(performance.now() - startedAt).toBeLessThan(1_000);
});
```

- [ ] **Step 8: Verify and commit**

Run: `pnpm test -- tests/unit/create-career.test.ts tests/integration/classic-career.test.ts tests/integration/detailed-career.test.ts`

Expected: creation tests and complete 21-season runs pass in both modes.

```bash
git add src/game/application tests/unit/create-career.test.ts tests/integration/classic-career.test.ts tests/integration/detailed-career.test.ts
git commit -m "feat: orchestrate complete player careers"
```

### Task 12: Calculate and explain the 0–1000 GOAT Score

**Files:**
- Create: `src/game/scoring/goat-score.ts`
- Create: `tests/unit/goat-score.test.ts`
- Create: `tests/property/goat-score.property.test.ts`

**Interfaces:**
- Consumes: retired `CareerState`, player position, archives, honours, national-team records, peak OVR, influence tags.
- Produces: `GoatScoreBreakdown` and `calculateGoatScore(career): GameResult<GoatScoreBreakdown>`.

- [ ] **Step 1: Write weighting and position-fairness tests**

```ts
it("returns seven components that sum to the total", () => {
  const result = calculateGoatScore(retiredForwardCareer());
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(Object.values(result.value.components).reduce((sum, value) => sum + value, 0))
      .toBe(result.value.total);
    expect(result.value.total).toBeGreaterThanOrEqual(0);
    expect(result.value.total).toBeLessThanOrEqual(1000);
  }
});

it("does not require goals for an elite goalkeeper score", () => {
  const goalkeeper = calculateGoatScore(eliteGoalkeeperCareer());
  const idleForward = calculateGoatScore(idleForwardCareer());
  expect(goalkeeper.ok && idleForward.ok && goalkeeper.value.total > idleForward.value.total).toBe(true);
});
```

- [ ] **Step 2: Verify score tests fail**

Run: `pnpm test -- tests/unit/goat-score.test.ts`

Expected: FAIL because the scoring module does not exist.

- [ ] **Step 3: Implement exact component caps**

```ts
export interface GoatScoreBreakdown {
  total: number;
  components: {
    performance: number;       // 0..350
    teamHonours: number;       // 0..150
    individualAwards: number;  // 0..150
    nationalTeam: number;      // 0..100
    peakOverall: number;       // 0..100
    longevity: number;         // 0..100
    influence: number;         // 0..50
  };
  explanations: readonly string[];
}
```

Normalize performance per 90 minutes and position. Use goalkeeper saves/clean sheets/goals prevented/rating; defender clean sheets/defensive contribution/rating; midfielder assists/chance creation/rating; forward goals/assists/efficiency/rating. Multiply seasonal performance by competition-level and difficulty factors, but cap each season before summing so one outlier year cannot fill the category.

Team honours multiply the trophy base value by the player's share of available minutes and average rating factor. Individual awards use fixed values by scope. National team uses appearances, tournament contribution, and honours. Peak OVR maps 55–95 linearly to 0–100. Longevity counts seasons with at least 900 minutes and rating at least 6.5. Influence uses captaincy, loyalty, milestone, comeback, and record tags.

- [ ] **Step 4: Generate explanations from measured facts**

Return 3–7 explanation strings chosen from the largest component contributors, for example `"14 high-level seasons contributed 82 longevity points"`. Do not output generic praise that cannot be traced to career data.

- [ ] **Step 5: Add property tests and commit**

Across arbitrary valid retired careers, assert component bounds, integer total, sum equality, replay equality, no NaN, and no input mutation.

Run: `pnpm test -- tests/unit/goat-score.test.ts tests/property/goat-score.property.test.ts`

Expected: all score bounds and position-fairness tests pass.

```bash
git add src/game/scoring/goat-score.ts tests/unit/goat-score.test.ts tests/property/goat-score.property.test.ts
git commit -m "feat: score and explain retired careers"
```

### Task 13: Persist three save slots and versioned JSON transfers

**Files:**
- Create: `src/persistence/save-schema.ts`
- Create: `src/persistence/career-db.ts`
- Create: `src/persistence/json-transfer.ts`
- Create: `tests/unit/persistence.test.ts`
- Create: `tests/unit/json-transfer.test.ts`

**Interfaces:**
- Consumes: `CareerState`, `World`, save/world schema versions.
- Produces: `CareerSlot = 1 | 2 | 3`, `listSlots()`, `loadSlot(slot)`, `commitSlot(slot, nextState, committedAt)`, `deleteSlot(slot)`, `restoreSlotBackup(slot)`, `exportCareer(state)`, `importCareer(text)`, `exportWorld(world)`, and `importWorld(text)`.

- [ ] **Step 1: Write IndexedDB transactional tests with fake-indexeddb**

```ts
import "fake-indexeddb/auto";

it("stores three independent slots and preserves the prior state as backup", async () => {
  const first = careerState({ age: 16 });
  const second = careerState({ age: 17 });
  await commitSlot(1, first, "2026-08-27T01:00:00.000Z");
  await commitSlot(1, second, "2026-08-27T02:00:00.000Z");
  await commitSlot(2, careerState({ age: 20 }), "2026-08-27T03:00:00.000Z");
  expect((await loadSlot(1))?.state.player.age).toBe(17);
  expect((await loadSlot(1))?.backup?.player.age).toBe(16);
  expect((await loadSlot(2))?.state.player.age).toBe(20);
  expect(await loadSlot(3)).toBeNull();
});
```

- [ ] **Step 2: Verify persistence tests fail**

Run: `pnpm test -- tests/unit/persistence.test.ts`

Expected: FAIL because persistence modules do not exist.

- [ ] **Step 3: Implement the database contract**

```ts
interface CareerDatabase extends DBSchema {
  careers: {
    key: CareerSlot;
    value: {
      slot: CareerSlot;
      state: CareerState;
      backup: CareerState | null;
      committedAt: string;
    };
  };
  settings: {
    key: "active-world";
    value: { key: "active-world"; world: World };
  };
}

const getDatabase = () => openDB<CareerDatabase>("open-pitch-legacy", 1, {
  upgrade(database) {
    database.createObjectStore("careers", { keyPath: "slot" });
    database.createObjectStore("settings", { keyPath: "key" });
  },
});
```

`commitSlot` must perform the read and replacement in one read-write transaction. Store the previous `state` as `backup`. The UI supplies `committedAt`; persistence may not call system time on behalf of the engine.

- [ ] **Step 4: Define versioned save validation**

Build strict Zod schemas for persisted state discriminants and bounded scalar fields, then use referential refinement for world, player club, fixtures, active event, and active moment. Reject unknown schema/rules major versions with an issue at `saveSchemaVersion` or `rulesVersion`. Preserve all validation issues; do not return a partial state.

- [ ] **Step 5: Implement JSON envelopes and tests**

```ts
export interface CareerExportEnvelope {
  kind: "open-pitch-legacy-career";
  exportedAt: string;
  saveSchemaVersion: 1;
  state: CareerState;
}

export interface WorldExportEnvelope {
  kind: "open-pitch-legacy-world";
  exportedAt: string;
  worldSchemaVersion: 1;
  world: World;
}
```

Test that a career export round-trips exactly, a world envelope cannot be imported as a career, invalid JSON returns line-independent parse feedback, an unsupported version is rejected, and failure never writes to IndexedDB.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test -- tests/unit/persistence.test.ts tests/unit/json-transfer.test.ts`

Expected: all slot, backup, delete, restore, round-trip, and import-safety tests pass.

```bash
git add src/persistence tests/unit/persistence.test.ts tests/unit/json-transfer.test.ts
git commit -m "feat: persist and transfer local careers"
```

### Task 14: Build the minimal Next.js application shell

**Files:**
- Create: `src/hooks/use-career-slot.ts`
- Create: `src/components/SlotCard.tsx`
- Create: `src/components/NewCareerForm.tsx`
- Create: `src/components/CareerSummary.tsx`
- Create: `src/components/ClassicControls.tsx`
- Create: `src/components/DetailedMatch.tsx`
- Create: `src/components/EventChoice.tsx`
- Create: `src/components/TransferChoices.tsx`
- Create: `src/components/ArchiveTable.tsx`
- Create: `src/components/GoatScorePanel.tsx`
- Create: `src/components/WorldTransfer.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/career/new/page.tsx`
- Create: `src/app/career/[slot]/page.tsx`
- Create: `src/app/career/[slot]/archive/page.tsx`
- Create: `src/app/career/[slot]/retirement/page.tsx`
- Create: `src/app/world/page.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/unit/ui-state.test.ts`

**Interfaces:**
- Consumes: pure `createCareer`, `dispatchCommand`, scoring, persistence, and JSON-transfer functions.
- Produces: the approved route set and a client-side `useCareerSlot(slot)` coordinator.

- [ ] **Step 1: Test the coordinator's commit-before-publish rule**

Extract a UI-independent `applyAndCommit(current, command, persist)` helper into `use-career-slot.ts` and test it directly:

```ts
it("does not publish a transition when persistence rejects", async () => {
  const current = careerState({ phase: "preseason" });
  const persist = vi.fn().mockRejectedValue(new Error("quota"));
  await expect(applyAndCommit(current, startSeasonCommand(), persist)).rejects.toThrow("quota");
  expect(current.phase).toBe("preseason");
});

it("returns the committed state after persistence succeeds", async () => {
  const current = careerState({ phase: "preseason" });
  const persist = vi.fn().mockResolvedValue(undefined);
  const next = await applyAndCommit(current, startSeasonCommand(), persist);
  expect(next.phase).not.toBe("preseason");
  expect(persist).toHaveBeenCalledWith(next);
});
```

- [ ] **Step 2: Implement the slot hook**

The hook loads a slot once on mount, exposes `{ state, status, error, dispatch, restoreBackup, exportSave }`, serializes commands through one promise chain, persists before calling React `setState`, and disables controls while a command is pending. It may format `committedAt` with `new Date().toISOString()` because that timestamp is persistence metadata, not simulation input.

- [ ] **Step 3: Build the home and creation flow**

The home page renders exactly three `SlotCard` components with accessible actions for New, Continue, Export, Import, Restore backup, and Delete. Destructive delete requires a native confirmation dialog and reports whether recovery is possible.

The new-career form exposes name, nationality, four-position radio group, preferred foot, shirt number, difficulty, seed, starting club, mode, training focus, and career intent. Validate client input before invoking `createCareer`; write the new state to the selected empty/replacement slot before navigating.

```tsx
<fieldset>
  <legend>Position</legend>
  {(["goalkeeper", "defender", "midfielder", "forward"] as const).map((position) => (
    <label key={position}>
      <input type="radio" name="position" value={position} required />
      {position}
    </label>
  ))}
</fieldset>
```

- [ ] **Step 4: Render phase-specific career controls**

Use the `CareerState.phase` discriminant:

- `preseason`: mode, training, and intent form.
- `classic-checkpoint`: event choice when active, otherwise Advance classic season.
- `detailed-prematch`: opponent/competition/fitness plus Start next match.
- `detailed-moment`: timeline, score, risk-labelled options.
- `detailed-postmatch`: report and Acknowledge.
- `season-review` and `transfer-window`: offers, role, wage, term, Stay, Seek transfer, Next season.
- `retired`: link to the retirement route.

Every button must dispatch one domain command; components may not directly edit the game state.
Every legal gameplay button must also carry `data-game-action` with the command type, the phase label must carry `data-testid="current-phase"`, and the active-moment container must carry `data-testid="active-moment"` so browser tests can report the exact paused state without coupling to prose.

- [ ] **Step 5: Build archive, retirement, and world routes**

Archive renders one semantic table row per age season and separate lists for transfers, honours, awards, and national-team records. Retirement calculates the score from the loaded retired career and shows total, seven component rows, and evidence explanations. World route previews current country/league/club counts, exports the active world, validates an uploaded world, displays every issue path, and requests confirmation before replacement.

- [ ] **Step 6: Add minimal accessible CSS**

Define only readable system typography, 44px minimum interactive targets, visible focus outlines, constrained content width, responsive table overflow, semantic success/error colors, and disabled/pending states. Do not add logos, gradients, animations, target-site colors, target-site layouts, or decorative imagery.

- [ ] **Step 7: Verify and commit**

Run: `pnpm test -- tests/unit/ui-state.test.ts && pnpm lint && pnpm build`

Expected: coordinator tests pass, all routes compile, ESLint exits 0, and Next build succeeds.

```bash
git add src/app src/components src/hooks tests/unit/ui-state.test.ts
git commit -m "feat: add minimal career simulator interface"
```

### Task 15: Add end-to-end acceptance coverage and documentation

**Files:**
- Create: `tests/e2e/home-and-save.spec.ts`
- Create: `tests/e2e/classic-career.spec.ts`
- Create: `tests/e2e/detailed-mode.spec.ts`
- Create: `tests/e2e/world-import.spec.ts`
- Create: `docs/world-format.md`
- Create: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: the complete Next.js app and public browser routes.
- Produces: automated acceptance evidence and user/developer documentation.

- [ ] **Step 1: Write the home/save browser test**

```ts
import { expect, test, type Page } from "@playwright/test";

test("creates, reloads, exports, deletes, and imports a local career", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New career in slot 1" }).click();
  await page.getByLabel("Player name").fill("Mira Vale");
  await page.getByLabel("midfielder").check();
  await page.getByLabel("Seed").fill("e2e-save");
  await page.getByRole("button", { name: "Create career" }).click();
  await expect(page.getByRole("heading", { name: /Mira Vale/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /Mira Vale/ })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export slot 1" }).click();
  const download = await downloadPromise;
  const exportedPath = await download.path();
  expect(exportedPath).not.toBeNull();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete slot 1" }).click();
  await expect(page.getByRole("button", { name: "New career in slot 1" })).toBeVisible();

  await page.getByLabel("Import career into slot 1").setInputFiles(exportedPath!);
  await page.getByRole("button", { name: "Confirm import into slot 1" }).click();
  await page.getByRole("link", { name: "Continue Mira Vale" }).click();
  await expect(page.getByRole("heading", { name: /Mira Vale/ })).toBeVisible();
});
```

- [ ] **Step 2: Write classic-mode retirement acceptance**

```ts
const createCareerFromUi = async (
  page: Page,
  input: { slot: 1 | 2 | 3; name: string; seed: string; mode: "classic" | "detailed" },
) => {
  await page.goto("/");
  await page.getByRole("button", { name: `New career in slot ${input.slot}` }).click();
  await page.getByLabel("Player name").fill(input.name);
  await page.getByLabel("midfielder").check();
  await page.getByLabel("Seed").fill(input.seed);
  await page.getByLabel("Mode").selectOption(input.mode);
  await page.getByLabel("Starting club").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Create career" }).click();
};

test("classic mode reaches an explained age-36 retirement", async ({ page }) => {
  test.setTimeout(90_000);
  await createCareerFromUi(page, { slot: 1, name: "Classic Runner", seed: "classic-e2e", mode: "classic" });

  for (let action = 0; action < 1_000; action += 1) {
    if (page.url().endsWith("/retirement")) break;
    const legal = page.locator("[data-game-action]:not([disabled])").first();
    if (await legal.count()) await legal.click();
    else {
      const phase = await page.getByTestId("current-phase").textContent();
      throw new Error(`No legal action in phase ${phase}`);
    }
  }

  await expect(page).toHaveURL(/\/retirement$/);
  await expect(page.getByTestId("goat-total")).toHaveText(/^[0-9]{1,4}$/);
  await expect(page.getByRole("row", { name: /Performance/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Influence/ })).toBeVisible();
  await page.getByRole("link", { name: "Career archive" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(21);
});
```

- [ ] **Step 3: Write detailed-mode pause/resume acceptance**

```ts
test("detailed mode restores and resolves a paused key moment", async ({ page }) => {
  await createCareerFromUi(page, { slot: 1, name: "Detail Runner", seed: "detail-e2e", mode: "detailed" });
  for (let action = 0; action < 80 && !(await page.getByTestId("active-moment").count()); action += 1) {
    await page.locator("[data-game-action]:not([disabled])").first().click();
  }
  const moment = page.getByTestId("active-moment");
  await expect(moment).toBeVisible();
  const before = await moment.textContent();
  await page.reload();
  await expect(page.getByTestId("active-moment")).toHaveText(before!);
  await page.getByTestId("active-moment").locator("[data-game-action]").first().click();
  await page.locator('[data-game-action="ACKNOWLEDGE_MATCH"]').click();
  await expect(page.getByTestId("completed-club-fixtures")).toHaveText("1");
});
```

- [ ] **Step 4: Write world import safety acceptance**

```ts
test("invalid world import cannot replace the active world", async ({ page }) => {
  await page.goto("/world");
  await page.getByLabel("Import world JSON").setInputFiles({
    name: "invalid-world.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, countries: [], leagues: [], clubs: [] })),
  });
  await expect(page.getByRole("alert")).toContainText("clubs");
  await page.reload();
  await expect(page.getByTestId("world-counts")).toHaveText("4 countries · 8 leagues · 80 clubs");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export active world" }).click();
  const validWorld = await downloadPromise;
  await page.getByLabel("Import world JSON").setInputFiles((await validWorld.path())!);
  await page.getByRole("button", { name: "Confirm world replacement" }).click();
  await expect(page.getByTestId("world-counts")).toHaveText("4 countries · 8 leagues · 80 clubs");
});
```

- [ ] **Step 5: Document the exact world format**

`docs/world-format.md` must include the schema version, required four-country/eight-league/eighty-club cardinality, every field and bound from Task 4, the five accepted playing styles, a complete one-country/two-league/twenty-club excerpt generated from the default world, import steps, and failure examples for duplicate IDs and invalid references.

- [ ] **Step 6: Document local development and product boundaries**

`README.md` must include Node 22+, pnpm 10+, `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm e2e`, `pnpm lint`, `pnpm build`, route descriptions, three-slot behavior, export/import recovery, deterministic seed behavior, and the explicit statement that all names/data/copy are original and no real-world football IP is bundled.

- [ ] **Step 7: Run the full verification matrix**

Run:

```bash
pnpm exec playwright install chromium
pnpm test
pnpm lint
pnpm build
pnpm e2e
```

Expected: every unit/property/integration test passes, ESLint exits 0, Next build succeeds, and all four Playwright specifications pass in Chromium.

- [ ] **Step 8: Review scope and repository state**

Run: `git diff --check && git status --short && rg -n "Il Nuovo Goat|FIFA|UEFA|Premier League|La Liga|Serie A|Bundesliga" src README.md docs/world-format.md`

Expected: no whitespace errors; only intended implementation/documentation changes remain; the restricted-name scan returns either no matches or only the README's explicit non-affiliation statement. Do not commit `.next`, `playwright-report`, `test-results`, or exported save files.

- [ ] **Step 9: Commit the acceptance layer**

```bash
git add tests/e2e docs/world-format.md README.md package.json
git commit -m "test: verify complete browser football careers"
```

## Final Acceptance Checklist

- [ ] Both modes complete exactly 21 seasons and retire after age 36.
- [ ] The default world always contains four countries, eight leagues, and eighty original clubs.
- [ ] League, domestic cup, continental cup, promotion/relegation, and national-team invariants pass across the property-test seed set.
- [ ] At least 72 original events exist with unique IDs and valid bounded effects.
- [ ] Same version, world, seed, and command sequence replay to an equal final state and score.
- [ ] Three IndexedDB slots keep one backup each and round-trip through versioned JSON.
- [ ] Invalid world or career imports report field paths and do not mutate existing data.
- [ ] GOAT Score is bounded to 0–1000, sums exactly from seven components, and explains measurable career facts.
- [ ] Minimal routes are keyboard-usable on desktop and phone widths without reproducing target-site visual design.
- [ ] `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm e2e` all exit 0.
