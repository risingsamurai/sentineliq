# SentineliQ


> **Multi-agent AI. One goal. Zero hand-holding.**

SentineliQ is a production-grade Multi-Agent AI Swarm system. Give it any complex problem and a swarm of 5 specialized AI agents will plan, research, execute, and validate the solution — autonomously.

## Architecture

```
User Goal → Orchestrator → Planner → Researcher → Executor → Validator
                                                        ↑          |
                                                        └──────────┘
                                                        (retry loop)
```

### Agents

| Agent | Role | Icon |
|-------|------|------|
| **Orchestrator** | Decomposes goals into subtasks | 🧠 |
| **Planner** | Creates step-by-step execution plans | 📋 |
| **Researcher** | Web search for real-time information | 🔍 |
| **Executor** | Produces the actual deliverable | ⚡ |
| **Validator** | Quality gate — scores output 0-100 | ✅ |

### Self-Healing Loop
If the Validator scores output below 75/100, the system automatically retries with feedback injected — up to 3 iterations.

## Tech Stack

- **Frontend:** React + Vite + CSS Design System
- **Backend:** Node.js + Express with SSE streaming
- **AI:** Anthropic Claude (`claude-sonnet-4-20250514`)
- **Search:** Claude built-in web_search tool
- **Communication:** REST API with Server-Sent Events

## Quick Start

### 1. Configure API Key

```bash
# In backend/.env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. Start Backend

```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the App

Navigate to `http://localhost:5173`

## Demo Scenarios

Try these example prompts:

1. **"Analyze the top 3 EV companies in 2025 and write an investment brief"**
2. **"Research the biggest AI agent startups right now and identify the top opportunity"**
3. **"Write a go-to-market strategy for a B2B SaaS product launching in Southeast Asia"**

## Project Structure

```
sentineliq/
├── backend/
│   ├── server.js              # Express server + SSE streaming
│   ├── agents/
│   │   ├── callAgent.js       # Shared Claude API helper
│   │   ├── orchestrator.js    # Goal decomposition
│   │   ├── planner.js         # Execution planning
│   │   ├── researcher.js      # Web search + synthesis
│   │   ├── executor.js        # Deliverable production
│   │   └── validator.js       # Quality validation
│   ├── .env                   # API key config
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app with SSE handling
│   │   ├── index.css          # Design system
│   │   ├── main.jsx           # Entry point
│   │   └── components/
│   │       ├── AgentCard.jsx   # Agent status cards
│   │       ├── OutputPanel.jsx # Markdown output display
│   │       ├── ScoreBar.jsx    # Validation score bar
│   │       └── TaskInput.jsx   # Input form
│   └── package.json
└── README.md
```

## Features

- 🎯 **5-agent swarm** with real Claude AI calls
- 🔍 **Live web search** via Claude's built-in web_search tool
- 🔄 **Self-healing loop** — automatic retries with validator feedback
- 📡 **SSE streaming** — live agent status updates
- 🌑 **Premium dark UI** — glassmorphism, animations, responsive
- 📊 **Validation dashboard** — score bar, issues, suggestions
- 📋 **Agent log** — full audit trail of the swarm execution
- 📄 **Markdown rendering** — polished output display

---

Built for hackathon glory. Powered by Claude.
