import { useState } from 'react';

const EXAMPLES = [
  'Analyze top 3 EV companies. Write investment brief.',
  'Map biggest AI agent startups in 2025. Surface top opportunity.',
  'GTM strategy for B2B SaaS entering Southeast Asia.',
];

export default function TaskInput({ onSubmit, disabled }) {
  const [task, setTask] = useState('');

  const handleSubmit = () => {
    if (task.trim() && !disabled) {
      onSubmit(task.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <>
      <div className="section-label stagger-1">// MISSION INPUT</div>
      <div className="task-input-panel stagger-2">
        <textarea
          className="task-textarea"
          placeholder="Define intelligence objective..."
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />

        <div className="example-chips">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              className="chip"
              onClick={() => setTask(ex)}
              disabled={disabled}
            >
              {ex}
            </button>
          ))}
        </div>

        <button
          className={`launch-btn ${disabled ? 'running' : ''}`}
          onClick={handleSubmit}
          disabled={disabled || !task.trim()}
        >
          {disabled ? 'SWARM ACTIVE ■' : 'INITIALIZE SWARM ▶'}
        </button>
      </div>
    </>
  );
}
