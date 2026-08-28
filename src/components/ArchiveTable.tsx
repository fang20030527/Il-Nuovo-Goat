import type { CareerState } from "@/game/domain/career";

export const ArchiveTable = ({ state }: { readonly state: CareerState }) => {
  const clubName = (id: string): string =>
    state.world.clubs.find((club) => club.id === id)?.name ?? id;

  return (
    <>
      <section className="panel" aria-label="Season archive">
        <h2>Season by season</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Season</th><th>Age</th><th>Club</th><th>Apps</th><th>Starts</th>
                <th>Minutes</th><th>Goals</th><th>Assists</th><th>Overall</th><th>Value</th>
              </tr>
            </thead>
            <tbody>
              {state.archives.map((archive) => (
                <tr key={archive.season}>
                  <td>{archive.season}</td>
                  <td>{archive.age}</td>
                  <td>{clubName(archive.clubId)}</td>
                  <td>{archive.stats.appearances}</td>
                  <td>{archive.stats.starts}</td>
                  <td>{archive.stats.minutes}</td>
                  <td>{archive.stats.goals}</td>
                  <td>{archive.stats.assists}</td>
                  <td>{archive.overall}</td>
                  <td>{archive.marketValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-label="Career history">
        <h2>Career history</h2>
        <ul>
          {state.careerHistory.map((entry, index) => (
            <li key={index}>
              Season {entry.season}, age {entry.age}: {entry.summary}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-label="Honours and awards">
        <h2>Honours</h2>
        {state.archives.some((archive) => archive.honours.length > 0) ? (
          <ul>
            {state.archives.flatMap((archive) =>
              archive.honours.map((honour) => (
                <li key={`${archive.season}-${honour.id}`}>
                  Season {archive.season}: {honour.label}
                </li>
              )),
            )}
          </ul>
        ) : (
          <p className="muted">No honours yet.</p>
        )}
        <h2>Awards</h2>
        {state.archives.some((archive) => archive.awards.length > 0) ? (
          <ul>
            {state.archives.flatMap((archive) =>
              archive.awards.map((award) => (
                <li key={`${archive.season}-${award.id}`}>
                  Season {archive.season}: {award.label} ({award.scope})
                </li>
              )),
            )}
          </ul>
        ) : (
          <p className="muted">No awards yet.</p>
        )}
        <h2>National team</h2>
        <p>
          {state.player.nationalTeam.caps} caps · {state.player.nationalTeam.goals} goals
        </p>
      </section>
    </>
  );
};
