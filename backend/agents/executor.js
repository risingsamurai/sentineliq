import { callAgent } from "./callAgent.js";

const SYSTEM_PROMPT = `You are the Executor agent in a multi-agent AI swarm called SentineliQ. Your job is to produce the actual deliverable output for the user's goal.

You will be given:
1. The original user goal
2. A detailed execution plan
3. Research findings with real data

Use all of this to produce a polished, high-quality, detailed final output — whether that is a report, strategy memo, investment brief, analysis, competitive review, or other content.

Requirements:
- Be thorough and comprehensive
- Use real data from the research findings
- Structure your output with clear headings, sections, and formatting
- Make it production-ready and impressive
- Use markdown formatting for readability`;

export async function runExecutor(context, validatorFeedback = null) {
  const planSummary = Array.isArray(context.plan)
    ? context.plan.join("\n")
    : "No detailed plan available.";

  let userMessage = `User goal: "${context.task}"

Execution plan:
${planSummary}

Research findings:
${context.research || "No research available."}

Produce the final deliverable output. Make it polished, thorough, and production-ready.`;

  if (validatorFeedback) {
    userMessage += `

IMPORTANT — Previous attempt was reviewed and needs improvement. Here is the validator feedback:
- Score: ${validatorFeedback.score}/100
- Issues: ${validatorFeedback.issues?.join("; ") || "None specified"}
- Suggestions: ${validatorFeedback.suggestions?.join("; ") || "None specified"}

Previous draft:
${context.draft_output}

Please address ALL issues and suggestions above to produce an improved version.`;
  }

  const response = await callAgent("Executor", SYSTEM_PROMPT, userMessage, {
    maxTokens: 4096,
  });

  context.draft_output = response;
  context.agent_log.push({
    agent: "Executor",
    status: "done",
    timestamp: new Date().toISOString(),
    summary: validatorFeedback
      ? `Revised output based on validator feedback (iteration ${context.iteration})`
      : `Produced initial draft output (${response.length} chars)`,
  });

  return context;
}
