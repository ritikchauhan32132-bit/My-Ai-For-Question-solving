/**
 * Ollama HTTP Client
 * Communicates with the local Ollama daemon via its REST API.
 * No external npm package required — uses native fetch.
 *
 * Ollama API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

export const OLLAMA_BASE_URL =
  (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');

export const OLLAMA_DEFAULT_MODEL =
  process.env.OLLAMA_MODEL || 'llama3.2';

// ─── Health / Discovery ──────────────────────────────────────────────────────

/**
 * Returns a list of locally available model names, or null if Ollama is not running.
 * Uses a 2-second timeout to prevent blocking the request pipeline.
 */
export async function getOllamaModels(): Promise<string[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    // data.models is an array of { name, ... }
    return Array.isArray(data.models)
      ? data.models.map((m: { name: string }) => m.name)
      : null;
  } catch {
    return null;
  }
}

/**
 * Returns true if Ollama is running AND has at least one model available.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  const models = await getOllamaModels();
  return models !== null && models.length > 0;
}

/**
 * Returns the best available model to use.
 * Prefers OLLAMA_MODEL env var, then llama3.2, llama3.1, mistral, phi3, gemma2,
 * then falls back to whatever the first available model is.
 */
export async function resolveBestOllamaModel(): Promise<string | null> {
  const models = await getOllamaModels();
  if (!models || models.length === 0) return null;

  const preferred = OLLAMA_DEFAULT_MODEL;
  // Exact match first
  if (models.some((m) => m === preferred || m.startsWith(preferred + ':'))) {
    return preferred;
  }
  // Preference order fallbacks (llama3.2 is optimal for CPU/laptop inference)
  const PRIORITY = ['llama3.2', 'llama3.1', 'llama3', 'mistral', 'phi3', 'gemma2', 'qwen2'];
  for (const p of PRIORITY) {
    const found = models.find((m) => m.startsWith(p));
    if (found) return found;
  }
  // Return whatever is first
  return models[0];
}

// ─── Chat Completion  ────────────────────────────────────────────────────────

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  message: { content: string };
}

/**
 * Sends a chat completion request to Ollama (/api/chat).
 * Returns the assistant message content string, or throws on failure.
 *
 * @param model   Model name as returned by getOllamaModels()
 * @param messages  Array of messages (system + user)
 * @param timeoutMs Request timeout in milliseconds (default 90s for large generations)
 */
export async function ollamaChat(
  model: string,
  messages: OllamaChatMessage[],
  timeoutMs = 90_000
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: 'json',         // Instruct Ollama to output valid JSON
        options: {
          temperature: 0.7,
          num_predict: 8192,    // Allow long JSON arrays
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama /api/chat error ${res.status}: ${errText}`);
    }

    const data: OllamaChatResponse = await res.json();
    return data.message?.content || '';
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Wrapper for a single-turn generation (system prompt + user message).
 * Returns the raw text content from Ollama.
 */
export async function ollamaGenerate(
  model: string,
  systemPrompt: string,
  userMessage: string,
  timeoutMs = 90_000
): Promise<string> {
  return ollamaChat(
    model,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    timeoutMs
  );
}
