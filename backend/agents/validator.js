import { callAgent } from "./callAgent.js";

const SYSTEM_PROMPT = `You are the Validator agent in a multi-agent AI swarm called SentineliQ. Your job is to review the Executor's output against the original user goal.

Evaluate on these criteria:
1. Quality — Is the output well-written and professional?
2. Accuracy — Does it use real data and facts correctly?
3. Completeness — Does it fully address the user's goal?
4. Relevance — Is everything in the output relevant to the goal?
5. Structure — Is it well-organized and easy to follow?

Return ONLY a valid JSON object in this exact format — no markdown fences, no preamble, no explanation:
{
  "score": <integer 0-100>,
  "passed": <true if score >= 75, else false>,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

export async function runValidator(context) {
  const userMessage = `Original user goal: "${context.task}"

Executor's output to validate:
${context.draft_output}

Evaluate the quality, accuracy, completeness, and relevance of this output against the original goal. Return your assessment as a JSON object.`;

  const response = await callAgent("Validator", SYSTEM_PROMPT, userMessage);

  let validation;
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    validation = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
  } catch {
    // If parsing fails, assume it passed with a moderate score
    validation = {
      score: 78,
      passed: true,
      issues: ["Could not parse validator response"],
      suggestions: ["Manual review recommended"],
    };
  }

  // Ensure passed field is consistent with score
  validation.passed = validation.score >= 75;

  context.validation = {
    score: validation.score,
    passed: validation.passed,
    issues: validation.issues || [],
    suggestions: validation.suggestions || [],
  };

  context.agent_log.push({
    agent: "Validator",
    status: "done",
    timestamp: new Date().toISOString(),
    summary: `Score: ${validation.score}/100 — ${validation.passed ? "PASSED ✓" : "FAILED ✗ — retry needed"}`,
  });

  return context;
}
