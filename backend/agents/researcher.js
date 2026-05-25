import { callAgent } from "./callAgent.js";

const SYSTEM_PROMPT = `You are the Researcher agent in a multi-agent AI swarm. Your job is to find relevant, accurate information needed to complete the user's goal using your training knowledge. Synthesize your findings into a clear, structured research brief with key facts, data points, and insights that the Executor agent will need to produce a high-quality output.`;

export async function runResearcher(context) {
  const planSummary = Array.isArray(context.plan)
    ? context.plan.join("\n")
    : "No detailed plan available.";

  const userMessage = `User goal: "${context.task}"

Execution plan:
${planSummary}

Research the information needed to execute this plan. Provide key facts, data points, statistics, and insights in a comprehensive research brief.`;

  const response = await callAgent("Researcher", SYSTEM_PROMPT, userMessage);

  context.research = response;
  context.agent_log.push({
    agent: "Researcher",
    status: "done",
    timestamp: new Date().toISOString(),
    summary: `Completed research brief (${response.length} chars). Key topics covered.`,
  });

  return context;
}
