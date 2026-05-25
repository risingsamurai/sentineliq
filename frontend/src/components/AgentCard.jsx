const AGENT_META = {
  orchestrator: { icon: '🧠', label: 'ORCHESTRATOR', role: 'Mission Planning' },
  planner:      { icon: '📋', label: 'PLANNER',      role: 'Execution Strategy' },
  researcher:   { icon: '🔍', label: 'RESEARCHER',   role: 'Intelligence Gathering' },
  executor_a:   { icon: '⚡', label: 'EXEC ALPHA',   role: 'Analytical Output' },
  executor_b:   { icon: '🎯', label: 'EXEC BETA',    role: 'Strategic Output' },
  judge:        { icon: '⚖️', label: 'JUDGE',         role: 'Arbitration' },
  validator:    { icon: '✅', label: 'VALIDATOR',     role: 'Quality Assurance' },
};

export default function AgentCard({ agentKey, status, summary, currentThought }) {
  const meta = AGENT_META[agentKey];
  if (!meta) return null;

  return (
    <div className={`agent-card ${status}`}>
      <div className="agent-card-header">
        <span className="agent-icon">{meta.icon}</span>
        <div className={`agent-status-badge ${status}`}>
          <span className="agent-status-dot" />
          {status}
        </div>
      </div>
      <div className="agent-name">{meta.label}</div>
      <div className="agent-role">{meta.role}</div>
      <div className="agent-summary">
        {summary || ''}
      </div>
      {status === 'running' && currentThought && (
        <div className="thought-ticker">
          <span key={currentThought} className="thought-text">
            → {currentThought}
          </span>
        </div>
      )}
    </div>
  );
}
