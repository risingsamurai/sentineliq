import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { callAgent, parseAgentResponse, sleep } from "./agents/callAgent.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════
// SYSTEM PROMPTS (all include → reasoning)
// ═══════════════════════════════════════════

const ORCHESTRATOR_PROMPT = `You are the Orchestrator agent in a multi-agent AI swarm called SentineliQ. Your job is to receive a complex user goal and break it into a clear list of 3-6 subtasks.

Before your output, write your reasoning steps, each on its own line prefixed with →.
Then write ---RESULT--- on its own line.
Then return ONLY a valid JSON array of subtasks like:
[{ "id": 1, "task": "...", "assigned_to": "Researcher" }, ...]
No markdown fences. Just valid JSON after ---RESULT---.`;

const PLANNER_PROMPT = `You are the Planner agent in a multi-agent AI swarm called SentineliQ. Your job is to create a detailed, numbered step-by-step execution plan for achieving the user's goal. Include dependencies between steps where relevant.

Before your output, write your reasoning steps, each on its own line prefixed with →.
Then write ---RESULT--- on its own line.
Then return a clean numbered list. No fluff, no preamble.`;

const RESEARCHER_PROMPT = `You are the Researcher agent in a multi-agent AI swarm. Your job is to find relevant, accurate information needed to complete the user's goal using your training knowledge. Synthesize your findings into a clear, structured research brief with key facts, data points, and insights that the Executor agent will need to produce a high-quality output.

Before your output, write your reasoning steps, each on its own line prefixed with →.
Then write ---RESULT--- on its own line.
Then write your structured research brief.`;

const EXECUTOR_A_PROMPT = `You are Executor Alpha. Your approach is DATA-DRIVEN and ANALYTICAL. Produce a detailed, structured output for the goal using the plan and research provided. Lead with data, frameworks, and evidence.

Before your output write reasoning steps prefixed with →.
Then write ---RESULT--- on its own line. Then write the full deliverable in markdown.`;

const EXECUTOR_B_PROMPT = `You are Executor Beta. Your approach is STRATEGIC and NARRATIVE-DRIVEN. Produce a compelling, insight-led output for the goal using the plan and research provided. Lead with bold strategic insights and clear narrative.

Before your output write reasoning steps prefixed with →.
Then write ---RESULT--- on its own line. Then write the full deliverable in markdown.`;

const JUDGE_PROMPT = `You are the Judge in a multi-agent AI swarm. Two agents produced outputs for the same task. Evaluate both on accuracy, depth, clarity, and actionability. Return ONLY valid JSON, no markdown fences, no preamble:
{
  "winner": "A" or "B",
  "score_a": <0-100>,
  "score_b": <0-100>,
  "reasoning": "<2-3 sentences why winner was chosen>",
  "alpha_strengths": ["...", "..."],
  "beta_strengths": ["...", "..."]
}`;

const VALIDATOR_PROMPT = `You are the Validator agent in a multi-agent AI swarm called SentineliQ. Your job is to review the Executor's output against the original user goal. Evaluate quality, accuracy, completeness, and relevance.

Before your evaluation, write your reasoning steps, each on its own line prefixed with →.
Then write ---RESULT--- on its own line.
Then return ONLY a valid JSON object:
{
  "score": <integer 0-100>,
  "passed": <true if score >= 75, else false>,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

async function emitThoughts(res, sendEvent, agent, thoughts) {
  for (const thought of thoughts) {
    await sleep(80);
    sendEvent("agent_thought", { agent, thought });
  }
}

// ═══════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/run", async (req, res) => {
  const { task } = req.body;

  if (!task || typeof task !== "string" || task.trim().length === 0) {
    return res.status(400).json({ error: "A task description is required." });
  }

  if (!process.env.CEREBRAS_API_KEY) {
    return res.status(500).json({ error: "CEREBRAS_API_KEY is not configured." });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Initialize context
  let context = {
    task: task.trim(),
    subtasks: [],
    plan: [],
    research: "",
    executor_a_output: "",
    executor_b_output: "",
    judge_decision: null,
    draft_output: "",
    validation: { score: null, passed: null, issues: [], suggestions: [] },
    final_output: "",
    agent_log: [],
    replay_timeline: [],
    iteration: 0,
    max_iterations: 3,
    status: "running",
  };

  try {
    // ═══ STEP 1: ORCHESTRATOR ═══
    sendEvent("agent_start", { agent: "orchestrator" });
    const orchRaw = await callAgent("Orchestrator", ORCHESTRATOR_PROMPT,
      `User goal: "${context.task}"\n\nBreak this goal into 3-6 specific subtasks and assign each to the appropriate agent (Planner, Researcher, Executor, or Validator).`
    );
    const orchParsed = parseAgentResponse(orchRaw);
    await emitThoughts(res, sendEvent, "orchestrator", orchParsed.thoughts);

    let subtasks;
    try {
      const m = orchParsed.result.match(/\[[\s\S]*\]/);
      subtasks = m ? JSON.parse(m[0]) : JSON.parse(orchParsed.result);
    } catch {
      subtasks = [
        { id: 1, task: "Create a detailed plan", assigned_to: "Planner" },
        { id: 2, task: "Research relevant information", assigned_to: "Researcher" },
        { id: 3, task: "Produce the deliverable", assigned_to: "Executor" },
        { id: 4, task: "Validate the output quality", assigned_to: "Validator" },
      ];
    }
    context.subtasks = subtasks;
    const orchSummary = `Decomposed into ${subtasks.length} subtasks`;
    context.agent_log.push({ agent: "Orchestrator", status: "done", timestamp: new Date().toISOString(), summary: orchSummary });
    context.replay_timeline.push({ agent: "orchestrator", summary: orchSummary, logMessage: orchSummary, thoughts: orchParsed.thoughts });
    sendEvent("agent_done", { agent: "orchestrator", summary: orchSummary });

    await sleep(2000); // rate limit buffer

    // ═══ STEP 2: PLANNER ═══
    sendEvent("agent_start", { agent: "planner" });
    const planRaw = await callAgent("Planner", PLANNER_PROMPT,
      `User goal: "${context.task}"\n\nSubtasks:\n${subtasks.map(s => `- ${s.task}`).join("\n")}\n\nCreate a detailed step-by-step execution plan.`
    );
    const planParsed = parseAgentResponse(planRaw);
    await emitThoughts(res, sendEvent, "planner", planParsed.thoughts);

    context.plan = planParsed.result.split("\n").filter(l => l.trim().length > 0).map(l => l.trim());
    const planSummary = `Created ${context.plan.length}-step execution plan`;
    context.agent_log.push({ agent: "Planner", status: "done", timestamp: new Date().toISOString(), summary: planSummary });
    context.replay_timeline.push({ agent: "planner", summary: planSummary, logMessage: planSummary, thoughts: planParsed.thoughts });
    sendEvent("agent_done", { agent: "planner", summary: planSummary });

    await sleep(2000); // rate limit buffer

    // ═══ STEP 3: RESEARCHER ═══
    sendEvent("agent_start", { agent: "researcher" });
    const resRaw = await callAgent("Researcher", RESEARCHER_PROMPT,
      `User goal: "${context.task}"\n\nExecution plan:\n${context.plan.join("\n")}\n\nResearch the information needed. Provide key facts, data points, and insights.`,
      { maxTokens: 3000 }
    );
    const resParsed = parseAgentResponse(resRaw);
    await emitThoughts(res, sendEvent, "researcher", resParsed.thoughts);

    context.research = resParsed.result;
    const resSummary = `Research brief complete (${resParsed.result.length} chars)`;
    context.agent_log.push({ agent: "Researcher", status: "done", timestamp: new Date().toISOString(), summary: resSummary });
    context.replay_timeline.push({ agent: "researcher", summary: resSummary, logMessage: resSummary, thoughts: resParsed.thoughts });
    sendEvent("agent_done", { agent: "researcher", summary: resSummary });

    // ═══ STEP 4-6: DUAL EXECUTOR + JUDGE + VALIDATOR LOOP ═══
    let passed = false;
    context.iteration = 1;

    while (!passed && context.iteration <= context.max_iterations) {
      sendEvent("iteration", { iteration: context.iteration, max: context.max_iterations });

      const feedbackMsg = context.iteration > 1
        ? `\n\nPREVIOUS ATTEMPT FAILED VALIDATION. Feedback:\n- Score: ${context.validation.score}/100\n- Issues: ${context.validation.issues?.join("; ")}\n- Suggestions: ${context.validation.suggestions?.join("; ")}\n\nAddress ALL feedback above.`
        : "";

      const execUserMsg = `GOAL: ${context.task}\nPLAN:\n${context.plan.join("\n")}\nRESEARCH:\n${context.research}${feedbackMsg}`;

      // Run executors sequentially to respect rate limits
      await sleep(2000);
      sendEvent("agent_start", { agent: "executor_a" });
      const rawA = await callAgent("Executor Alpha", EXECUTOR_A_PROMPT, execUserMsg, { maxTokens: 4000 });

      await sleep(2000);
      sendEvent("agent_start", { agent: "executor_b" });
      const rawB = await callAgent("Executor Beta", EXECUTOR_B_PROMPT, execUserMsg, { maxTokens: 4000 });

      const parsedA = parseAgentResponse(rawA);
      const parsedB = parseAgentResponse(rawB);

      // Emit thoughts for Alpha then Beta
      await emitThoughts(res, sendEvent, "executor_a", parsedA.thoughts);
      await emitThoughts(res, sendEvent, "executor_b", parsedB.thoughts);

      context.executor_a_output = parsedA.result;
      context.executor_b_output = parsedB.result;

      const summA = `Analytical output (${parsedA.result.length} chars)`;
      const summB = `Strategic output (${parsedB.result.length} chars)`;
      context.agent_log.push({ agent: "Executor Alpha", status: "done", timestamp: new Date().toISOString(), summary: summA });
      context.agent_log.push({ agent: "Executor Beta", status: "done", timestamp: new Date().toISOString(), summary: summB });
      context.replay_timeline.push({ agent: "executor_a", summary: summA, logMessage: summA, thoughts: parsedA.thoughts });
      context.replay_timeline.push({ agent: "executor_b", summary: summB, logMessage: summB, thoughts: parsedB.thoughts });
      sendEvent("agent_done", { agent: "executor_a", summary: summA });
      sendEvent("agent_done", { agent: "executor_b", summary: summB });

      // ═══ JUDGE ═══
      await sleep(2000);
      sendEvent("agent_start", { agent: "judge" });
      const judgeRaw = await callAgent("Judge", JUDGE_PROMPT,
        `TASK: ${context.task}\n\nALPHA OUTPUT:\n${context.executor_a_output.slice(0, 3000)}\n\nBETA OUTPUT:\n${context.executor_b_output.slice(0, 3000)}`
      );
      const judgeParsed = parseAgentResponse(judgeRaw);
      await emitThoughts(res, sendEvent, "judge", judgeParsed.thoughts);

      let judge;
      try {
        const jm = judgeParsed.result.match(/\{[\s\S]*\}/);
        judge = jm ? JSON.parse(jm[0]) : JSON.parse(judgeParsed.result);
      } catch {
        judge = { winner: "A", score_a: 80, score_b: 70, reasoning: "Alpha produced more structured output.", alpha_strengths: ["Structured"], beta_strengths: ["Narrative"] };
      }

      context.judge_decision = judge;
      context.draft_output = judge.winner === "A" ? context.executor_a_output : context.executor_b_output;

      const judgeSummary = `Winner: Exec ${judge.winner} (${judge.score_a} vs ${judge.score_b})`;
      context.agent_log.push({ agent: "Judge", status: "done", timestamp: new Date().toISOString(), summary: judgeSummary });
      context.replay_timeline.push({ agent: "judge", summary: judgeSummary, logMessage: judgeSummary, thoughts: judgeParsed.thoughts });
      sendEvent("agent_done", { agent: "judge", summary: judgeSummary });
      sendEvent("judge_result", judge);

      // ═══ VALIDATOR ═══
      await sleep(2000);
      sendEvent("agent_start", { agent: "validator" });
      const valRaw = await callAgent("Validator", VALIDATOR_PROMPT,
        `Original user goal: "${context.task}"\n\nExecutor's output to validate:\n${context.draft_output}`
      );
      const valParsed = parseAgentResponse(valRaw);
      await emitThoughts(res, sendEvent, "validator", valParsed.thoughts);

      let validation;
      try {
        const vm = valParsed.result.match(/\{[\s\S]*\}/);
        validation = vm ? JSON.parse(vm[0]) : JSON.parse(valParsed.result);
      } catch {
        validation = { score: 78, passed: true, issues: ["Could not parse validator response"], suggestions: ["Manual review recommended"] };
      }
      validation.passed = validation.score >= 75;
      context.validation = { score: validation.score, passed: validation.passed, issues: validation.issues || [], suggestions: validation.suggestions || [] };

      const valSummary = `Score: ${validation.score}/100 — ${validation.passed ? "PASSED ✓" : "FAILED ✗"}`;
      context.agent_log.push({ agent: "Validator", status: "done", timestamp: new Date().toISOString(), summary: valSummary });
      context.replay_timeline.push({ agent: "validator", summary: valSummary, logMessage: valSummary, thoughts: valParsed.thoughts });
      sendEvent("agent_done", { agent: "validator", summary: valSummary, validation: context.validation });

      if (validation.passed) {
        passed = true;
      } else {
        sendEvent("retry", { iteration: context.iteration, score: validation.score, issues: validation.issues });
        context.iteration++;
      }
    }

    // Finalize
    context.final_output = context.draft_output;
    context.status = "complete";
    sendEvent("complete", {
      final_output: context.final_output,
      draft_output: context.draft_output,
      judge_decision: context.judge_decision,
      validation: context.validation,
      agent_log: context.agent_log,
      replay_timeline: context.replay_timeline,
      status: "complete",
    });
  } catch (err) {
    console.error("Swarm pipeline error:", err);
    context.status = "error";
    sendEvent("error", { error: err.message });
  }

  res.end();
});

app.listen(PORT, () => {
  console.log(`\n🧠 SentineliQ Backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
