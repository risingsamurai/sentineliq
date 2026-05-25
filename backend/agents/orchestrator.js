import { callAgent } from "./callAgent.js";

const SYSTEM_PROMPT = `You are the Orchestrator agent in a multi-agent AI swarm called SentineliQ. Your job is to receive a complex user goal and break it into a clear list of 3-6 subtasks that the swarm will execute. Each subtask should be specific, actionable, and assigned to one of these agents: Planner, Researcher, Executor, Validator.

Return your response as a JSON array of subtasks like:
[{ "id": 1, "task": "...", "assigned_to": "Researcher" }, ...]

Nothing else — just valid JSON. No markdown fences, no explanation.`;

export async function runOrchestrator(context) {
  const userMessage = `User goal: "${context.task}"

Break this goal into 3-6 specific subtasks and assign each to the appropriate agent (Planner, Researcher, Executor, or Validator).`;

  const response = await callAgent("Orchestrator", SYSTEM_PROMPT, userMessage);

  let subtasks;
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    subtasks = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
  } catch {
    subtasks = [
      { id: 1, task: "Create a detailed plan", assigned_to: "Planner" },
      { id: 2, task: "Research relevant information", assigned_to: "Researcher" },
      { id: 3, task: "Produce the deliverable", assigned_to: "Executor" },
      { id: 4, task: "Validate the output quality", assigned_to: "Validator" },
    ];
  }

  context.subtasks = subtasks;
  context.agent_log.push({
    agent: "Orchestrator",
    status: "done",
    timestamp: new Date().toISOString(),
    summary: `Decomposed the goal into ${subtasks.length} subtasks: ${subtasks.map((s) => s.task).join("; ")}`,
  });

  return context;
}
