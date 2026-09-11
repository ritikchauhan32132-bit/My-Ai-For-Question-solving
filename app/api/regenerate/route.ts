import { NextResponse } from 'next/server';
import { regenerateSingleQuestion } from '@/lib/ai';
import { RegenerateRequest } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body: RegenerateRequest = await request.json();
    const { topic, number, difficulty, type, language, existingQuestionsSummary } = body;

    if (!topic || !number || !difficulty || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters for question regeneration.' },
        { status: 400 }
      );
    }

    const newQuestion = await regenerateSingleQuestion(
      topic,
      number,
      difficulty,
      type,
      language,
      existingQuestionsSummary
    );

    return NextResponse.json({
      success: true,
      question: newQuestion,
    });
  } catch (error: any) {
    console.error('API /regenerate error:', error);
    const safeError = typeof error?.message === 'string' && !error.message.toLowerCase().includes('key')
      ? error.message
      : 'Failed to regenerate question.';
    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  }
}
