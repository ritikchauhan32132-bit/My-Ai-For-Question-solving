import { NextResponse } from 'next/server';
import { generate50Questions, isAiConfigured } from '@/lib/ai';
import { GenerateRequest } from '@/lib/types';

export const maxDuration = 60; // Allow up to 60s for comprehensive AI generation

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { topic, typeMode = 'Mixed', preferredLanguage, seed } = body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'Topic cannot be empty. Please enter a valid topic or question.' },
        { status: 400 }
      );
    }

    if (topic.trim().length > 250) {
      return NextResponse.json(
        { error: 'Topic is too long. Please provide a concise subject or interview topic.' },
        { status: 400 }
      );
    }

    const requestSeed = seed || `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const { questions, isAiGenerated, language, provider } = await generate50Questions(
      topic.trim(),
      typeMode,
      preferredLanguage,
      requestSeed
    );

    return NextResponse.json({
      success: true,
      topic: topic.trim(),
      questions,
      count: questions.length,
      isAiGenerated,
      hasOpenAiKey: isAiConfigured(),
      language,
      typeMode,
      provider,
      seed: requestSeed,
    });
  } catch (error: any) {
    console.error('API /generate error:', error);
    const safeError = typeof error?.message === 'string' && !error.message.toLowerCase().includes('key')
      ? error.message
      : 'An unexpected error occurred while generating questions.';
    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  }
}
