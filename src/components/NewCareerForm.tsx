"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { World } from "@/game/domain/world";
import type { PositionFamily } from "@/game/domain/world";
import type { Difficulty, GameMode, TrainingFocus, CareerIntent } from "@/game/domain/career";
import type { CareerSlot } from "@/persistence/career-db";
import { createCareer } from "@/game/application/create-career";
import { commitSlot } from "@/persistence/career-db";
import { clubId, countryId, type ClubId, type CountryId } from "@/game/domain/ids";

const POSITIONS: readonly PositionFamily[] = ["goalkeeper", "defender", "midfielder", "forward"];
const DIFFICULTIES: readonly Difficulty[] = ["story", "balanced", "hard"];
const MODES: readonly GameMode[] = ["classic", "detailed"];
const TRAINING: readonly TrainingFocus[] = ["technique", "awareness", "physical", "mentality"];
const INTENTS: readonly CareerIntent[] = ["earn-start", "steady-growth", "chase-honours", "seek-transfer"];

interface NewCareerFormProps {
  readonly slot: CareerSlot;
  readonly world: World;
  readonly occupied: boolean;
  readonly defaultMode?: GameMode;
}

export const NewCareerForm = ({ slot, world, occupied, defaultMode = "classic" }: NewCareerFormProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [nationality, setNationality] = useState<CountryId>(world.countries[0].id);
  const [leagueId, setLeagueId] = useState<string>(world.leagues[0].id);

  const leagues = useMemo(
    () => world.leagues.filter((league) => league.countryId === nationality),
    [world, nationality],
  );
  const clubs = useMemo(
    () => world.clubs.filter((club) => club.leagueId === leagueId),
    [world, leagueId],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (occupied && !window.confirm("Replace the existing career in this slot?")) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const result = createCareer({
      world,
      playerName: String(form.get("playerName") ?? ""),
      nationality,
      position: String(form.get("position")) as PositionFamily,
      preferredFoot: String(form.get("preferredFoot") ?? "right") as "left" | "right",
      shirtNumber: Number(form.get("shirtNumber")),
      difficulty: String(form.get("difficulty")) as Difficulty,
      seed: String(form.get("seed") ?? ""),
      startingClubId: clubId(String(form.get("startingClubId"))) as ClubId,
      mode: String(form.get("mode")) as GameMode,
      trainingFocus: String(form.get("trainingFocus")) as TrainingFocus,
      careerIntent: String(form.get("careerIntent")) as CareerIntent,
    });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPending(true);
    try {
      await commitSlot(slot, result.value, new Date().toISOString());
      router.push(`/career/${slot}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save career");
      setPending(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="panel form-stack">
      <label>
        Player name
        <input name="playerName" required minLength={1} maxLength={40} />
      </label>

      <label>
        Nationality
        <select
          name="nationality"
          value={nationality}
          onChange={(event) => {
            const next = countryId(event.target.value) as CountryId;
            setNationality(next);
            const firstLeague = world.leagues.find((league) => league.countryId === next);
            if (firstLeague) setLeagueId(firstLeague.id);
          }}
        >
          {world.countries.map((country) => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Position</legend>
        {POSITIONS.map((position) => (
          <label key={position}>
            <input type="radio" name="position" value={position} required />
            {position}
          </label>
        ))}
      </fieldset>

      <label>
        Preferred foot
        <select name="preferredFoot" defaultValue="right">
          <option value="right">Right</option>
          <option value="left">Left</option>
        </select>
      </label>

      <label>
        Shirt number
        <input name="shirtNumber" type="number" min={1} max={99} defaultValue={9} required />
      </label>

      <label>
        Difficulty
        <select name="difficulty" defaultValue="balanced">
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>{difficulty}</option>
          ))}
        </select>
      </label>

      <label>
        Seed
        <input name="seed" required minLength={1} maxLength={64} />
      </label>

      <label>
        League
        <select name="league" value={leagueId} onChange={(event) => setLeagueId(event.target.value)}>
          {leagues.map((league) => (
            <option key={league.id} value={league.id}>{league.name}</option>
          ))}
        </select>
      </label>

      <label>
        Starting club
        <select name="startingClubId" required>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>{club.name}</option>
          ))}
        </select>
      </label>

      <label>
        Mode
        <select name="mode" defaultValue={defaultMode}>
          {MODES.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </label>

      <label>
        Training focus
        <select name="trainingFocus" defaultValue="technique">
          {TRAINING.map((focus) => (
            <option key={focus} value={focus}>{focus}</option>
          ))}
        </select>
      </label>

      <label>
        Career intent
        <select name="careerIntent" defaultValue="steady-growth">
          {INTENTS.map((intent) => (
            <option key={intent} value={intent}>{intent}</option>
          ))}
        </select>
      </label>

      {error !== null && <p role="alert" className="error-text">{error}</p>}
      <button type="submit" className="primary" disabled={pending} data-game-action="create-career">
        {pending ? "Creating…" : "Create career"}
      </button>
    </form>
  );
};
