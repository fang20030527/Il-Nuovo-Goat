import type { CareerState } from "@/game/domain/career";

export const CareerSummary = ({ state }: { readonly state: CareerState }) => {
  const club = state.world.clubs.find((entry) => entry.id === state.player.clubId);
  const league = club ? state.world.leagues.find((entry) => entry.id === club.leagueId) : null;
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
        <div><dt>Fitness</dt><dd>{state.player.fitness}</dd></div>
        <div><dt>Form</dt><dd>{state.player.form}</dd></div>
        <div><dt>Morale</dt><dd>{state.player.morale}</dd></div>
        <div><dt>Coach trust</dt><dd>{state.player.coachTrust}</dd></div>
        <div><dt>Role</dt><dd>{state.player.contract.role}</dd></div>
        {state.player.injury !== null && (
          <div><dt>Injury</dt><dd>{state.player.injury.severity} ({state.player.injury.remainingMatches} matches)</dd></div>
        )}
      </dl>
    </section>
  );
};
