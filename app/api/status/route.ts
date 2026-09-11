import { NextResponse } from 'next/server';
import { isAiConfigured } from '@/lib/ai';
import { isOllamaAvailable, resolveBestOllamaModel, OLLAMA_DEFAULT_MODEL } from '@/lib/ollama';

export async function GET() {
  const hasOpenAiKey = isAiConfigured();

  // Async check — resolves quickly (2s timeout built into the Ollama client)
  const [ollamaAvailable, ollamaModel] = await Promise.all([
    isOllamaAvailable(),
    resolveBestOllamaModel(),
  ]);

  // Determine the active provider based on priority
  const activeProvider = hasOpenAiKey
    ? 'OpenAI'
    : ollamaAvailable && ollamaModel
    ? `Ollama (${ollamaModel})`
    : 'Structured Demo';

  const mode = hasOpenAiKey
    ? 'AI Mode — OpenAI'
    : ollamaAvailable && ollamaModel
    ? `AI Mode — Ollama (${ollamaModel})`
    : 'Demo Mode — no AI configured';

  return NextResponse.json({
    hasOpenAiKey,
    hasOllama: ollamaAvailable,
    ollamaModel: ollamaModel || OLLAMA_DEFAULT_MODEL,
    activeProvider,
    mode,
    openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });
}

