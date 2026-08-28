import type { CareerState } from "@/game/domain/career";

export const CareerSummary = ({ state }: { readonly state: CareerState }) => {
  const club = state.world.clubs.find((entry) => entry.id === state.player.clubId);
  const league = club ? state.world.leagues.find((entry) => entry.id === club.leagueId) : null;
  const season = state.player.currentSeasonStats;
  const career = state.player.careerStats;
  return (
    <section className="panel" aria-label="Career summary">
      <h2>{state.player.name}</h2>
      <dl className="stats-grid">
        <div><dt>Age</dt><dd>{state.player.age}</dd></div>
        <div><dt>Overall</dt><dd>{state.player.overall}</dd></div>
        <div><dt>Potential</dt><dd>{state.player.potential}</dd></div>
        <div><dt>Position</dt><dd>{state.player.position}</dd></div>
        <div><dt>Club</dt><dd>{club?.name ?? "Unknown"}</dd></div>
        <div><dt>League</dt><dd>{league?.name ?? "Unknown"}</dd></div>
        <div><dt>Season</dt><dd>{state.season.season}</dd></div>
        <div><dt>Reputation</dt><dd>{state.player.reputation}</dd></div>
        <div><dt>Market value</dt><dd>{state.player.marketValue.toLocaleString()}</dd></div>
        <div><dt>Fitness</dt><dd>{state.player.fitness}</dd></div>
        <div><dt>Form</dt><dd>{state.player.form}</dd></div>
        <div><dt>Morale</dt><dd>{state.player.morale}</dd></div>
        <div><dt>Coach trust</dt><dd>{state.player.coachTrust}</dd></div>
        <div>
          <dt>Contract</dt>
          <dd>
            {state.player.contract.role} · until S{state.player.contract.endSeason} ·{" "}
            {state.player.contract.weeklyWage.toLocaleString()}/wk
          </dd>
        </div>
        {state.player.injury !== null && (
          <div><dt>Injury</dt><dd>{state.player.injury.severity} ({state.player.injury.remainingMatches} matches)</dd></div>
        )}
      </dl>

      <h3 className="muted">Attributes</h3>
      <dl className="stats-grid">
        <div><dt>Technique</dt><dd>{state.player.attributes.technique}</dd></div>
        <div><dt>Awareness</dt><dd>{state.player.attributes.awareness}</dd></div>
        <div><dt>Physical</dt><dd>{state.player.attributes.physical}</dd></div>
        <div><dt>Mentality</dt><dd>{state.player.attributes.mentality}</dd></div>
      </dl>

      <h3 className="muted">Production</h3>
      <dl className="stats-grid">
        <div><dt>This season</dt><dd>{season.appearances} apps · {season.goals} g · {season.assists} a</dd></div>
        <div><dt>Career</dt><dd>{career.appearances} apps · {career.goals} g · {career.assists} a</dd></div>
        <div>
          <dt>National team</dt>
          <dd>{state.player.nationalTeam.caps} caps · {state.player.nationalTeam.goals} goals</dd>
        </div>
      </dl>
    </section>
  );
};
