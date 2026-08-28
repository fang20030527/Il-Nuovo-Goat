import type { World } from "@/game/domain/world";

/**
 * World preview: country → league level → clubs. Read-only; the point is to
 * reassure the player that the world about to seed their career is the one
 * they expect (default or imported).
 */
export const WorldOverview = ({ world }: { readonly world: World }) => (
  <section className="panel" aria-label="World overview">
    <h2>Structure</h2>
    <p className="muted">
      {world.countries.length} countries · {world.leagues.length} leagues ·{" "}
      {world.clubs.length} clubs
    </p>
    <div className="world-grid">
      {world.countries.map((country) => {
        const leagues = world.leagues.filter((league) => league.countryId === country.id);
        return (
          <article key={country.id} className="mode-card green world-country">
            <span className="card-label green">Country</span>
            <h3>{country.name}</h3>
            <p className="muted">National team strength {country.nationalTeamStrength}</p>
            {leagues.map((league) => {
              const clubs = world.clubs.filter((club) => club.leagueId === league.id);
              return (
                <details key={league.id}>
                  <summary>
                    {league.name} <span className="muted">({clubs.length})</span>
                  </summary>
                  <ul>
                    {clubs.map((club) => (
                      <li key={club.id}>
                        {club.name} <span className="muted">rep {club.reputation} · {club.style}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </article>
        );
      })}
    </div>
  </section>
);
