import { useEffect, useRef } from 'react';

export default function AgentLog({ logs }) {
  const feedRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (ts) => {
    if (!ts) return '——:——:——';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="agent-log-panel">
      <div className="section-label">// AGENT LOG</div>
      <div className="log-feed" ref={feedRef}>
        {logs.length === 0 ? (
          <div className="log-init">
            SYSTEM READY. AWAITING DEPLOYMENT.
          </div>
        ) : (
          logs.map((entry, i) => (
            <div className="log-entry" key={i}>
              <span className="log-time">[{formatTime(entry.timestamp)}]</span>
              <span className={`log-agent ${entry.agent?.toLowerCase() || 'system'}`}>
                [{(entry.agent || 'SYSTEM').toUpperCase()}]
              </span>
              <span className="log-msg">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
