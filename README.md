# Open Pitch Legacy

An original, fully offline football career simulator. Guide a fictional player from a 16-year-old academy prospect to retirement at 36 — through league seasons, domestic and continental cups, promotion and relegation battles, international tournaments, transfers, injuries, and 70+ original career events — then have the whole career judged by a 0–1000 GOAT Score with a full explanation.

Everything runs locally in your browser. No accounts, no servers, no telemetry.

## Requirements

- Node.js 22 or newer
- pnpm 10 or newer

## Getting started

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm test` | Unit, property, and integration tests (Vitest) |
| `pnpm e2e` | Browser acceptance tests (Playwright, Chromium) |
| `pnpm lint` | ESLint |

Before running `pnpm e2e` for the first time: `pnpm exec playwright install chromium`.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Save slots — three local careers, with export / import / delete |
| `/career/new?slot=N` | Create a career in slot N (name, position family, starting club, seed, mode) |
| `/career/N` | Play the career in slot N |
| `/career/N/retirement` | GOAT Score breakdown for a retired career |
| `/career/N/archive` | Season-by-season career archive (21 seasons) |
| `/world` | Inspect the active world; export or replace it with a custom JSON world |

## Saves

- **Three slots**, stored in your browser's IndexedDB. Each slot also keeps **one backup** (the previous committed state), restorable from the career page.
- **Export** a slot from the home page to get a versioned JSON save file; **import** it back on any browser to continue the same career.
- Save files carry the full world snapshot, so importing an old save never depends on which world is currently active.
- Malformed or incompatible imports are rejected with field-level errors and never overwrite existing data.

## Determinism

Every career is created with a text **seed**. The same game version + world + seed + command sequence always replays to an identical final state and GOAT Score. There are no hidden clocks or non-seeded random calls in the engine.

## Game modes

- **Classic** — resolve a whole season in a few clicks, with events at checkpoints.
- **Detailed** — play match by match; key moments pause the match and ask for a decision (penalty taker, pass or shoot, tracking a runner…). You can switch modes only at season boundaries.

## Custom worlds

The bundled world is 4 fictional countries × 2 divisions × 10 clubs (80 clubs). You can replace it with your own fictional universe: see [docs/world-format.md](docs/world-format.md) for the exact JSON format, cardinality rules, field bounds, and a complete example.

## Original content statement

All names, clubs, leagues, countries, events, and copy in Open Pitch Legacy are original fiction created for this project. No real-world football intellectual property — leagues, clubs, players, federations, or competitions — is bundled, referenced, or required. This project is an independent work and is not affiliated with any existing football game, league, or organization.
