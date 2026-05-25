/**
 * Shared Cerebras API call helper + response parsing utilities.
 * Includes retry with exponential backoff for rate limits.
 */
export async function callAgent(agentName, systemPrompt, userMessage, options = {}) {
  const { maxTokens = 2000 } = options;
  const MAX_RETRIES = 3;

  const body = {
    model: "llama3.1-8b",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    // Retry on rate limit
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const waitSec = 3 * Math.pow(2, attempt); // 3s, 6s, 12s
      console.warn(`[${agentName}] Rate limited. Retrying in ${waitSec}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent ${agentName} API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Agent ${agentName} error: ${data.error.message}`);
    }

    return data.choices[0].message.content;
  }
}

/**
 * Extract → reasoning lines and ---RESULT--- separated output.
 */
export function parseAgentResponse(raw) {
  const parts = raw.split('---RESULT---');
  const thoughtLines = (parts[0] || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('→'))
    .map(l => l.replace('→', '').trim());
  const result = parts[1]?.trim() || raw;
  return { thoughts: thoughtLines, result };
}

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
