"use client";

import { useMemo, useState } from "react";
import type { CountryId } from "@/game/domain/ids";

interface MapCountry {
  readonly id: string;
  readonly name: string;
  readonly d: string;
}

// Simplified Europe-centric map; playable nations are drawn larger than life
// so they remain clickable at panel size.
const COUNTRIES: readonly MapCountry[] = [
  // British Isles
  { id: "eng", name: "England", d: "M 232 118 L 244 106 L 258 100 L 268 108 L 264 124 L 252 134 L 240 130 Z" },
  { id: "irl", name: "Ireland", d: "M 212 112 L 224 104 L 232 112 L 228 126 L 216 128 L 208 120 Z" },
  { id: "sco", name: "Scotland", d: "M 238 92 L 252 82 L 262 88 L 258 100 L 246 106 Z" },
  // Iberia
  { id: "es", name: "Spain", d: "M 218 190 L 244 182 L 268 184 L 280 194 L 272 210 L 252 218 L 230 214 L 218 204 Z" },
  { id: "pt", name: "Portugal", d: "M 208 192 L 218 190 L 218 204 L 228 214 L 220 220 L 210 212 Z" },
  // France / Low countries
  { id: "fr", name: "France", d: "M 244 140 L 268 132 L 288 136 L 296 152 L 288 170 L 268 178 L 250 168 L 242 154 Z" },
  { id: "be", name: "Belgium", d: "M 272 124 L 284 120 L 290 128 L 282 136 L 272 132 Z" },
  { id: "nl", name: "Netherlands", d: "M 278 112 L 290 108 L 296 116 L 288 124 L 278 120 Z" },
  // Germany
  { id: "de", name: "Germany", d: "M 292 108 L 312 100 L 330 104 L 336 120 L 330 138 L 314 146 L 298 138 L 290 122 Z" },
  // Italy (boot)
  { id: "it", name: "Italy", d: "M 302 156 L 314 148 L 324 152 L 330 164 L 336 178 L 344 192 L 352 204 L 344 208 L 334 198 L 326 184 L 318 172 L 308 164 Z" },
  { id: "sard", name: "Sardinia", d: "M 300 186 L 308 182 L 312 190 L 306 198 L 300 194 Z" },
  { id: "sic", name: "Sicily", d: "M 330 210 L 342 206 L 348 212 L 340 218 L 330 216 Z" },
  // Central / Eastern Europe
  { id: "pl", name: "Poland", d: "M 336 104 L 360 98 L 378 106 L 374 124 L 356 132 L 338 122 Z" },
  { id: "at", name: "Austria", d: "M 312 146 L 328 140 L 340 146 L 336 156 L 320 158 Z" },
  { id: "ch", name: "Switzerland", d: "M 288 152 L 300 148 L 308 154 L 300 162 L 290 160 Z" },
  { id: "cz", name: "Czechia", d: "M 332 128 L 348 124 L 354 132 L 344 140 L 334 136 Z" },
  { id: "hu", name: "Hungary", d: "M 340 146 L 354 142 L 360 150 L 352 158 L 342 154 Z" },
  { id: "eu-east", name: "Eastern Europe", d: "M 378 106 L 410 100 L 440 108 L 448 128 L 440 150 L 420 162 L 400 156 L 380 140 L 374 124 Z" },
  // Scandinavia
  { id: "se", name: "Sweden", d: "M 296 60 L 312 48 L 324 56 L 320 76 L 310 90 L 300 80 Z" },
  { id: "no", name: "Norway", d: "M 278 52 L 294 40 L 306 46 L 298 64 L 286 74 L 278 66 Z" },
  { id: "dk", name: "Denmark", d: "M 296 92 L 306 86 L 312 94 L 304 102 Z" },
  { id: "fi", name: "Finland", d: "M 330 44 L 346 36 L 358 44 L 352 62 L 340 72 L 330 62 Z" },
  // Balkans / Greece
  { id: "balkan", name: "Balkans", d: "M 352 164 L 370 158 L 386 166 L 390 182 L 380 196 L 366 200 L 356 190 L 350 176 Z" },
  { id: "gr", name: "Greece", d: "M 374 200 L 388 196 L 394 206 L 388 218 L 376 220 L 370 210 Z" },
  // Turkey
  { id: "tr", name: "Turkey", d: "M 400 190 L 430 184 L 456 190 L 458 204 L 436 212 L 410 206 Z" },
  // North Africa sliver
  { id: "na", name: "North Africa", d: "M 220 232 L 280 226 L 340 230 L 400 226 L 400 248 L 340 252 L 280 248 L 220 244 Z" },
] as const;

const PLAYABLE_IDS = new Set(["it", "eng", "es", "de"]);

interface WorldMapPickerProps {
  readonly countries: readonly { id: CountryId; name: string }[];
  readonly selected: CountryId;
  readonly onSelect: (id: CountryId) => void;
}

// Map from our country IDs to map region IDs
const COUNTRY_TO_MAP: Record<string, string> = {
  italy: "it",
  england: "eng",
  spain: "es",
  germany: "de",
};

const MAP_TO_COUNTRY: Record<string, string> = {
  it: "italy",
  eng: "england",
  es: "spain",
  de: "germany",
};

export const WorldMapPicker = ({ countries, selected, onSelect }: WorldMapPickerProps) => {
  const [search, setSearch] = useState("");

  const filteredCountries = useMemo(() => {
    if (search.trim() === "") return countries;
    const lower = search.toLowerCase();
    return countries.filter((c) => c.name.toLowerCase().includes(lower));
  }, [countries, search]);

  const selectedMapId = COUNTRY_TO_MAP[selected] ?? null;

  const handleMapClick = (mapId: string) => {
    const countryId = MAP_TO_COUNTRY[mapId];
    if (countryId && countries.some((c) => c.id === countryId)) {
      onSelect(countryId as CountryId);
    }
  };

  const selectedCountry = countries.find((c) => COUNTRY_TO_MAP[c.id] === selectedMapId);

  return (
    <div className="world-map-picker">
      <div className="map-search">
        <input
          type="text"
          placeholder="Type a nation"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search nationality"
        />
      </div>
      <p className="muted" style={{ fontSize: "0.8rem", margin: "0.5rem 0" }}>
        Playable nations in orange · click for the briefing
      </p>
      <div className="map-container">
        <svg viewBox="190 30 290 235" role="img" aria-label="Europe map">
          {/* Ocean background */}
          <rect x="190" y="30" width="290" height="235" fill="#0d1a12" rx="4" />
          {/* Continents */}
          {COUNTRIES.map((country) => {
            const isPlayable = PLAYABLE_IDS.has(country.id);
            const isSelected = country.id === selectedMapId;
            const isFiltered = search.trim() !== "" && !filteredCountries.some(
              (c) => COUNTRY_TO_MAP[c.id] === country.id,
            );
            return (
              <path
                key={country.id}
                d={country.d}
                className={`map-country ${isPlayable ? "playable" : ""} ${isSelected ? "selected" : ""}`}
                onClick={() => isPlayable && handleMapClick(country.id)}
                role={isPlayable ? "button" : undefined}
                aria-label={isPlayable ? country.name : undefined}
                style={{
                  opacity: isFiltered ? 0.2 : isSelected ? 1 : isPlayable ? 0.85 : 0.35,
                  cursor: isPlayable ? "pointer" : "default",
                }}
              />
            );
          })}
        </svg>
        <div className="map-briefing">
          {selectedCountry ? (
            <>
              <p className="eyebrow" style={{ margin: 0 }}>
                {selectedCountry.name}
              </p>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "0.4rem 0 0" }}>
                Two national divisions, a domestic cup and continental qualification.
              </p>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "0.4rem 0 0" }}>
                Pick a league below to choose where your career begins.
              </p>
            </>
          ) : (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Click a playable nation to see leagues, cup and continentals.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
