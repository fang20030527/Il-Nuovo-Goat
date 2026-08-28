# World format

Open Pitch Legacy worlds are plain JSON files. They describe the entire fictional football universe a career can live in: countries, leagues, and clubs. All bundled content is original fiction — no real-world leagues, clubs, or players appear anywhere.

- Schema version: `1` (the only accepted value today)
- File type: UTF-8 JSON, conventionally `world.json`
- Top-level envelope: exactly `{ "schemaVersion": 1, "countries": [...], "leagues": [...], "clubs": [...] }` — no additional keys are allowed.

## Cardinality rules

A world must satisfy all of these, or the import is rejected with a field-level error:

- Exactly **4 countries**
- Exactly **2 leagues per country**, one at `level: 1` and one at `level: 2` (8 leagues total)
- Exactly **10 clubs per league** (80 clubs total)
- All `id` values are globally unique within their collection
- Every `countryId` / `leagueId` reference must point at an entity that exists in the same file
- A club's league must belong to the same country as the club

## Field reference

Shared rules:

- `id`: lowercase kebab-case ASCII — `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- `name`: 1–60 printable characters (no control characters)
- All ratings are integers in `1..100` unless stated otherwise.

### Country

| Field | Type | Bounds |
| --- | --- | --- |
| `id` | string | id pattern, unique |
| `name` | string | 1–60 chars |
| `nationalTeamStrength` | int | 1–100 |

### League

| Field | Type | Bounds |
| --- | --- | --- |
| `id` | string | id pattern, unique |
| `countryId` | string | must reference an existing country |
| `name` | string | 1–60 chars |
| `level` | int | exactly `1` or `2` |

### Club

| Field | Type | Bounds |
| --- | --- | --- |
| `id` | string | id pattern, unique |
| `name` | string | 1–60 chars |
| `countryId` | string | must reference an existing country |
| `leagueId` | string | must reference a league in the same country |
| `reputation` | int | 1–100 |
| `finances` | int | 1–100 |
| `academy` | int | 1–100 |
| `facilities` | int | 1–100 |
| `lines.goalkeeper` | int | 1–100 |
| `lines.defender` | int | 1–100 |
| `lines.midfielder` | int | 1–100 |
| `lines.forward` | int | 1–100 |
| `style` | enum | `balanced`, `pressing`, `counter`, `possession`, `direct` |
| `homeAdvantage` | int | 0–10 |

## Excerpt: one complete country

This excerpt (Northland, from the bundled default world) shows the full shape of a country, its two leagues, and its clubs. A valid file needs four such countries. Only the first three clubs are shown; a real import must contain all ten clubs per league.

```json
{
  "schemaVersion": 1,
  "countries": [
    { "id": "northland", "name": "Northland", "nationalTeamStrength": 78 }
  ],
  "leagues": [
    { "id": "northland-1", "countryId": "northland", "name": "Northland Premier Division", "level": 1 },
    { "id": "northland-2", "countryId": "northland", "name": "Northland Second Division", "level": 2 }
  ],
  "clubs": [
    {
      "id": "northland-aster-vale",
      "name": "Aster Vale Athletic",
      "countryId": "northland",
      "leagueId": "northland-1",
      "reputation": 80,
      "finances": 76,
      "academy": 73,
      "facilities": 76,
      "lines": { "goalkeeper": 75, "defender": 76, "midfielder": 77, "forward": 78 },
      "style": "balanced",
      "homeAdvantage": 3
    },
    {
      "id": "northland-ironford",
      "name": "Ironford Athletic",
      "countryId": "northland",
      "leagueId": "northland-1",
      "reputation": 78,
      "finances": 76,
      "academy": 74,
      "facilities": 74,
      "lines": { "goalkeeper": 74, "defender": 75, "midfielder": 76, "forward": 72 },
      "style": "pressing",
      "homeAdvantage": 4
    }
  ]
}
```

To obtain a complete, always-valid starting point, open `/world` in the app and use **Export world**, then edit the downloaded file.

## Importing a world

1. Open the **World** page (`/world`).
2. Choose **Import world JSON** and pick your file.
3. If validation fails, every issue is listed with its field path, and the active world is left untouched.
4. If validation passes, review the preview counts (countries / leagues / clubs), then confirm with **Replace active world**.
5. The new world applies to careers created afterwards; in-progress careers keep the world they started in (saved inside their save file).

## Failure examples

Every failure reports the exact field path and never mutates the currently active world.

Duplicate club IDs:

```json
{ "clubs": [ { "id": "northland-aster-vale", "...": "..." }, { "id": "northland-aster-vale", "...": "..." } ] }
```

→ `clubs: Club ids must be unique`

Dangling league reference:

```json
{ "clubs": [ { "id": "northland-rookport", "leagueId": "northland-9", "...": "..." } ] }
```

→ `clubs.0.leagueId: Unknown league northland-9`

Wrong per-league club count:

→ `clubs: League northland-2 requires exactly ten clubs, found 7`

Not a world file at all (wrong schema version or unexpected shape):

→ `File is not an Open Pitch Legacy world export`
