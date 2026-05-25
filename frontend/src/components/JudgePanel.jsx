export default function JudgePanel({ judgeResult }) {
  if (!judgeResult) return null;

  const { winner, score_a, score_b, reasoning, alpha_strengths, beta_strengths } = judgeResult;

  return (
    <div className="judge-section">
      <div className="section-label">// ARBITRATION RESULT</div>
      <div className="judge-panel">
        <div className="judge-cards">
          <div className={`judge-card ${winner === 'A' ? 'winner' : 'loser'}`}>
            <div className="judge-card-header">
              <span className="judge-card-icon">⚡</span>
              <span className="judge-card-label">EXEC ALPHA</span>
            </div>
            <div className="judge-card-score">
              <span className={`judge-score-num ${winner === 'A' ? 'green' : ''}`}>{score_a}</span>
              <span className="judge-score-max">/ 100</span>
            </div>
            <div className="judge-score-track">
              <div
                className={`judge-score-fill ${winner === 'A' ? 'green' : 'dim'}`}
                style={{ width: `${score_a}%` }}
              />
            </div>
            <div className="judge-strengths">
              <div className="judge-strengths-label">STRENGTHS</div>
              <ul>
                {(alpha_strengths || []).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          <div className="judge-vs">VS</div>

          <div className={`judge-card ${winner === 'B' ? 'winner' : 'loser'}`}>
            <div className="judge-card-header">
              <span className="judge-card-icon">🎯</span>
              <span className="judge-card-label">EXEC BETA</span>
            </div>
            <div className="judge-card-score">
              <span className={`judge-score-num ${winner === 'B' ? 'green' : ''}`}>{score_b}</span>
              <span className="judge-score-max">/ 100</span>
            </div>
            <div className="judge-score-track">
              <div
                className={`judge-score-fill ${winner === 'B' ? 'green' : 'dim'}`}
                style={{ width: `${score_b}%` }}
              />
            </div>
            <div className="judge-strengths">
              <div className="judge-strengths-label">STRENGTHS</div>
              <ul>
                {(beta_strengths || []).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div className="judge-verdict">
          <span className="judge-winner-label">
            ▶ WINNER: {winner === 'A' ? 'EXEC ALPHA' : 'EXEC BETA'}
          </span>
          <p className="judge-reasoning">{reasoning}</p>
        </div>
      </div>
    </div>
  );
}
