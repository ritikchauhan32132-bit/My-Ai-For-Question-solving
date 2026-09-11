import { NextResponse } from 'next/server';
import { explainQuestionDeepDive } from '@/lib/ai';
import { ExplainRequest } from '@/lib/types';

export const maxDuration = 45;

export async function POST(request: Request) {
  try {
    const body: ExplainRequest = await request.json();
    const { question, topic, language } = body;

    if (!question || !question.question) {
      return NextResponse.json(
        { error: 'Valid question payload is required.' },
        { status: 400 }
      );
    }

    const explanationResult = await explainQuestionDeepDive(
      question,
      topic || question.expectedConcept || 'Topic',
      language
    );

    return NextResponse.json({
      success: true,
      ...explanationResult,
    });
  } catch (error: any) {
    console.error('API /explain error:', error);
    const safeError = typeof error?.message === 'string' && !error.message.toLowerCase().includes('key')
      ? error.message
      : 'Failed to generate deep-dive explanation.';
    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  }
}
