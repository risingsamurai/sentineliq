import { useState, useCallback, useEffect, useRef } from 'react';
import TaskInput from './components/TaskInput';
import AgentCard from './components/AgentCard';
import AgentLog from './components/AgentLog';
import ScoreBar from './components/ScoreBar';
import JudgePanel from './components/JudgePanel';
import OutputPanel from './components/OutputPanel';

const AGENTS = ['orchestrator', 'planner', 'researcher', 'executor_a', 'executor_b', 'judge', 'validator'];

const INITIAL_STATUSES = {
  orchestrator: 'idle', planner: 'idle', researcher: 'idle',
  executor_a: 'idle', executor_b: 'idle', judge: 'idle', validator: 'idle',
};

const sleepMs = (ms) => new Promise(r => setTimeout(r, ms));

export default function App() {
  const [appStatus, setAppStatus] = useState('idle');
  const [task, setTask] = useState('');
  const [agentStatuses, setAgentStatuses] = useState({ ...INITIAL_STATUSES });
  const [agentSummaries, setAgentSummaries] = useState({});
  const [agentThoughts, setAgentThoughts] = useState({});
  const [logs, setLogs] = useState([]);
  const [output, setOutput] = useState('');
  const [score, setScore] = useState(null);
  const [iteration, setIteration] = useState(0);
  const [maxIterations, setMaxIterations] = useState(3);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState(null);
  const [clock, setClock] = useState('');
  const [judgeResult, setJudgeResult] = useState(null);
  const startTimeRef = useRef(null);

  // Replay state
  const [replayTimeline, setReplayTimeline] = useState([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [storedOutput, setStoredOutput] = useState('');
  const [storedScore, setStoredScore] = useState(null);
  const [storedJudgeResult, setStoredJudgeResult] = useState(null);

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour12: false }) + ' UTC' + (now.getTimezoneOffset() > 0 ? '-' : '+') + String(Math.abs(now.getTimezoneOffset() / 60)).padStart(2, '0'));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const addLog = useCallback((agent, message) => {
    setLogs((prev) => [...prev, { agent, message, timestamp: new Date().toISOString() }]);
  }, []);

  const handleSubmit = useCallback(async (taskText) => {
    setTask(taskText);
    setAppStatus('running');
    setAgentStatuses({ ...INITIAL_STATUSES });
    setAgentSummaries({});
    setAgentThoughts({});
    setLogs([]);
    setOutput('');
    setScore(null);
    setIteration(0);
    setIsRetrying(false);
    setError(null);
    setJudgeResult(null);
    setReplayTimeline([]);
    startTimeRef.current = Date.now();

    addLog('system', `Swarm initialized. Objective: "${taskText}"`);

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskText }),
      });

      if (!response.ok && !response.headers.get('content-type')?.includes('text/event-stream')) {
        const err = await response.json();
        throw new Error(err.error || `Server error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = null;
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              processEvent(eventType, data);
            } catch { /* skip */ }
            eventType = null;
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setAppStatus('error');
      addLog('system', `ERROR: ${err.message}`);
    }
  }, [addLog]);

  const processEvent = useCallback((event, data) => {
    switch (event) {
      case 'agent_start':
        setAgentStatuses((prev) => ({ ...prev, [data.agent]: 'running' }));
        addLog(data.agent, 'Agent activated. Processing...');
        break;

      case 'agent_thought':
        setAgentThoughts((prev) => ({ ...prev, [data.agent]: data.thought }));
        break;

      case 'agent_done':
        setAgentStatuses((prev) => ({ ...prev, [data.agent]: 'done' }));
        setAgentSummaries((prev) => ({ ...prev, [data.agent]: data.summary }));
        addLog(data.agent, data.summary || 'Task complete.');
        if (data.validation) {
          setScore(data.validation.score);
        }
        break;

      case 'judge_result':
        setJudgeResult(data);
        setStoredJudgeResult(data);
        break;

      case 'iteration':
        setIteration(data.iteration);
        setMaxIterations(data.max);
        addLog('system', `Iteration ${data.iteration} of ${data.max}`);
        break;

      case 'retry':
        setIsRetrying(true);
        setAgentStatuses((prev) => ({
          ...prev,
          executor_a: 'idle', executor_b: 'idle', judge: 'idle', validator: 'idle',
        }));
        addLog('system', `Validation failed (score: ${data.score}). Retrying with feedback...`);
        setTimeout(() => setIsRetrying(false), 2000);
        break;

      case 'complete':
        setOutput(data.final_output || data.draft_output || '');
        setStoredOutput(data.final_output || data.draft_output || '');
        if (data.validation?.score != null) {
          setScore(data.validation.score);
          setStoredScore(data.validation.score);
        }
        if (data.judge_decision) {
          setJudgeResult(data.judge_decision);
          setStoredJudgeResult(data.judge_decision);
        }
        if (data.replay_timeline) {
          setReplayTimeline(data.replay_timeline);
        }
        setAppStatus('complete');
        addLog('system', 'Mission complete. Output delivered.');
        break;

      case 'error':
        setError(data.error);
        setAppStatus('error');
        addLog('system', `ERROR: ${data.error}`);
        break;

      default:
        break;
    }
  }, [addLog]);

  // ═══ MISSION REPLAY ═══
  const replayMission = useCallback(async () => {
    if (replayTimeline.length === 0) return;

    setIsReplaying(true);
    setOutput('');
    setScore(null);
    setJudgeResult(null);
    setAgentSummaries({});
    setAgentThoughts({});
    setLogs([{ agent: 'system', message: 'REPLAYING MISSION...', timestamp: new Date().toISOString() }]);
    setAgentStatuses({ ...INITIAL_STATUSES });

    await sleepMs(400);

    for (const step of replayTimeline) {
      setAgentStatuses((prev) => ({ ...prev, [step.agent]: 'running' }));
      addLog(step.agent, 'Processing...');

      for (const thought of (step.thoughts || [])) {
        await sleepMs(120);
        setAgentThoughts((prev) => ({ ...prev, [step.agent]: thought }));
      }

      await sleepMs(600);

      setAgentStatuses((prev) => ({ ...prev, [step.agent]: 'done' }));
      setAgentSummaries((prev) => ({ ...prev, [step.agent]: step.summary }));
      addLog(step.agent, step.summary || step.logMessage);

      await sleepMs(300);
    }

    await sleepMs(400);
    setJudgeResult(storedJudgeResult);
    await sleepMs(600);
    setScore(storedScore);
    await sleepMs(400);
    setOutput(storedOutput);
    setIsReplaying(false);
    addLog('system', 'REPLAY COMPLETE.');
  }, [replayTimeline, storedOutput, storedScore, storedJudgeResult, addLog]);

  const doneCount = Object.values(agentStatuses).filter((s) => s === 'done').length;
  const totalAgents = AGENTS.length;
  const nodeLabel = appStatus === 'idle'
    ? '0 NODES'
    : `${doneCount}/${totalAgents} COMPLETE`;

  const centerText = appStatus === 'idle'
    ? 'AWAITING TASK'
    : task.length > 60 ? task.slice(0, 60) + '...' : task;

  const statusLabel = isReplaying ? 'REPLAY' : appStatus.toUpperCase();
  const dotStatus = isReplaying ? 'running' : appStatus;

  return (
    <div className="app-shell">
      {/* ═══ TOP BAR ═══ */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-logo"><span>⬡</span> SWARMIQ</div>
        </div>
        <div className={`topbar-center ${appStatus !== 'idle' ? 'active' : ''}`}>
          {centerText}
        </div>
        <div className="topbar-right">
          <div className="status-indicator">
            <span className={`status-dot ${dotStatus}`} />
            <span className={`status-label ${dotStatus}`}>{statusLabel}</span>
          </div>
          <span className="topbar-time">{clock}</span>
        </div>
      </header>

      {error && <div className="error-banner">▲ {error}</div>}

      {/* ═══ MAIN AREA ═══ */}
      <div className="main-area">
        <div className="col-left">
          <TaskInput onSubmit={handleSubmit} disabled={appStatus === 'running' || isReplaying} />
          <AgentLog logs={logs} />
        </div>

        <div className="col-right">
          <div className="agent-grid-section stagger-3">
            <div className="section-label">// ACTIVE AGENTS — {nodeLabel}</div>
            <div className="agent-grid">
              {AGENTS.map((agent) => (
                <AgentCard
                  key={agent}
                  agentKey={agent}
                  status={agentStatuses[agent]}
                  summary={agentSummaries[agent]}
                  currentThought={agentThoughts[agent]}
                />
              ))}
            </div>
          </div>

          <JudgePanel judgeResult={judgeResult} />

          <ScoreBar
            score={score}
            iteration={iteration}
            maxIterations={maxIterations}
            isRetrying={isRetrying}
          />

          <OutputPanel
            output={output}
            startTime={startTimeRef.current}
            isComplete={appStatus === 'complete'}
            onReplay={replayTimeline.length > 0 ? replayMission : null}
            isReplaying={isReplaying}
          />
        </div>
      </div>
    </div>
  );
}
