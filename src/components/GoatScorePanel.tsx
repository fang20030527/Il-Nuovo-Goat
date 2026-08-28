import type { GoatScoreBreakdown } from "@/game/scoring/goat-score";

export const GoatScorePanel = ({ breakdown }: { readonly breakdown: GoatScoreBreakdown }) => (
  <section className="panel" aria-label="GOAT score">
    <h2>GOAT score: {breakdown.total} / 1000</h2>
    <div className="table-scroll">
      <table>
        <thead>
          <tr><th>Component</th><th>Score</th></tr>
        </thead>
        <tbody>
          <tr><td>Performance</td><td>{breakdown.components.performance} / 350</td></tr>
          <tr><td>Team honours</td><td>{breakdown.components.teamHonours} / 150</td></tr>
          <tr><td>Individual awards</td><td>{breakdown.components.individualAwards} / 150</td></tr>
          <tr><td>National team</td><td>{breakdown.components.nationalTeam} / 100</td></tr>
          <tr><td>Peak overall</td><td>{breakdown.components.peakOverall} / 100</td></tr>
          <tr><td>Longevity</td><td>{breakdown.components.longevity} / 100</td></tr>
          <tr><td>Influence</td><td>{breakdown.components.influence} / 50</td></tr>
        </tbody>
      </table>
    </div>
    <details>
      <summary>How the score was calculated</summary>
      <ul>
        {breakdown.explanations.map((explanation, index) => (
          <li key={index}>{explanation}</li>
        ))}
      </ul>
    </details>
  </section>
);
