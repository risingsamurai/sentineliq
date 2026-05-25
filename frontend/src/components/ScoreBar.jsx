export default function ScoreBar({ score, iteration, maxIterations, isRetrying }) {
  if (score === null || score === undefined) return null;

  const level = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';

  return (
    <div className="score-section">
      <div className="score-row">
        <span className="score-label">Confidence Score</span>
        <span className={`score-value ${level}`}>
          {score} / 100
        </span>
      </div>
      <div className="score-track">
        <div
          className={`score-fill ${level}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {iteration > 0 && (
        <div className={`iteration-label ${isRetrying ? 'retrying' : ''}`}>
          {isRetrying
            ? `⟳ RETRYING — ITERATION ${String(iteration).padStart(2, '0')} / ${String(maxIterations).padStart(2, '0')}`
            : `ITERATION ${String(iteration).padStart(2, '0')} / ${String(maxIterations).padStart(2, '0')}`
          }
        </div>
      )}
    </div>
  );
}
