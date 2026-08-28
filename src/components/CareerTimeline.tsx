import type { CareerState } from "@/game/domain/career";

const MAX_VISIBLE = 8;

/**
 * The season timeline is the narrative thread: engine-written lines describing
 * moments, events and milestones as they happen. Showing the tail keeps the
 * player oriented without scrolling through a whole season.
 */
export const CareerTimeline = ({ state }: { readonly state: CareerState }) => {
  const seasonLines = state.season.detailed?.timeline ?? [];
  const historyTail = state.careerHistory.slice(-MAX_VISIBLE).reverse();
  const seasonTail = seasonLines.slice(-MAX_VISIBLE).reverse();

  if (seasonTail.length === 0 && historyTail.length === 0) return null;

  return (
    <section className="panel" aria-label="Career timeline">
      <h2>Timeline</h2>
      {seasonTail.length > 0 && (
        <>
          <h3 className="muted">This season</h3>
          <ul className="timeline">
            {seasonTail.map((line, index) => (
              <li key={`s-${index}`}>{line}</li>
            ))}
          </ul>
        </>
      )}
      {historyTail.length > 0 && (
        <>
          <h3 className="muted">Career</h3>
          <ul className="timeline">
            {historyTail.map((entry, index) => (
              <li key={`c-${index}`}>
                <span className="muted">S{entry.season} · age {entry.age} — </span>
                {entry.summary}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
