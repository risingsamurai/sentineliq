import { callAgent } from "./callAgent.js";

const SYSTEM_PROMPT = `You are the Planner agent in a multi-agent AI swarm called SentineliQ. Your job is to create a detailed, numbered step-by-step execution plan for achieving the user's goal.

Include dependencies between steps where relevant (e.g., "Step 3 depends on Step 1 and 2").
Be specific and thorough. Each step should be actionable.
Return a clean numbered list. No fluff, no preamble.`;

export async function runPlanner(context) {
  const subtaskSummary = context.subtasks
    ? context.subtasks.map((s) => `- ${s.task} (${s.assigned_to})`).join("\n")
    : "No subtasks defined yet.";

  const userMessage = `User goal: "${context.task}"

Orchestrator has broken this into the following subtasks:
${subtaskSummary}

Create a detailed, numbered step-by-step execution plan for achieving this goal. Include dependencies between steps where relevant.`;

  const response = await callAgent("Planner", SYSTEM_PROMPT, userMessage);

  // Parse numbered plan into array
  const planLines = response
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => line.trim());

  context.plan = planLines;
  context.agent_log.push({
    agent: "Planner",
    status: "done",
    timestamp: new Date().toISOString(),
    summary: `Created a ${planLines.length}-step execution plan`,
  });

  return context;
}
