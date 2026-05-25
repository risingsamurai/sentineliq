import { useState, useMemo } from 'react';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

export default function OutputPanel({ output, startTime, isComplete, onReplay, isReplaying }) {
  const [showToast, setShowToast] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1800);
  };

  const wordCount = useMemo(() => {
    if (!output) return 0;
    return output.split(/\s+/).filter(Boolean).length;
  }, [output]);

  const elapsed = useMemo(() => {
    if (!startTime) return null;
    const s = ((Date.now() - startTime) / 1000).toFixed(1);
    return s;
  }, [output, startTime]);

  const html = useMemo(() => {
    if (!output) return '';
    return marked.parse(output);
  }, [output]);

  return (
    <>
      <div className="output-section">
        <div className="section-label">// INTELLIGENCE OUTPUT</div>
        <div className="output-panel">
          {output ? (
            <div
              className="output-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="output-empty">
              AWAITING INTELLIGENCE OUTPUT<span className="cursor-blink">_</span>
            </div>
          )}
        </div>
        <div className="output-bar">
          <span className="output-meta">
            {output
              ? `${wordCount} WORDS  |  ${elapsed || '—'}S`
              : 'NO DATA'
            }
          </span>
          <div className="output-bar-actions">
            {isComplete && onReplay && (
              <button
                className="replay-btn"
                onClick={onReplay}
                disabled={isReplaying}
              >
                {isReplaying ? 'REPLAYING...' : '⟳ REPLAY MISSION'}
              </button>
            )}
            {output && (
              <button className="btn-copy" onClick={handleCopy}>
                COPY OUTPUT
              </button>
            )}
          </div>
        </div>
      </div>

      {showToast && <div className="toast">✓ COPIED TO CLIPBOARD</div>}
    </>
  );
}
