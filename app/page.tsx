'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { LoadingScreen } from '@/components/LoadingScreen';
import { QuestionList } from '@/components/QuestionList';
import { ExplainModal } from '@/components/ExplainModal';
import { SavedSetsModal } from '@/components/SavedSetsModal';
import { ToastProvider, useToast } from '@/components/Toast';
import { Question, QuestionSet, QuestionType, ResponseLanguage } from '@/lib/types';
import { saveQuestionSet, toggleBookmarkQuestion, getBookmarkedQuestions } from '@/lib/storage';
import { AlertCircle } from 'lucide-react';

function DashboardContent() {
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionType, setQuestionType] = useState<QuestionType>('Mixed');
  const [language, setLanguage] = useState<string>('English');
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [hasOpenAiKey, setHasOpenAiKey] = useState(false);
  const [provider, setProvider] = useState<string>('Structured Demo');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [isSavedSetsOpen, setIsSavedSetsOpen] = useState(false);
  const [explainQuestion, setExplainQuestion] = useState<Question | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const { showToast } = useToast();

  // Load API status and initial bookmarks on mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setHasOpenAiKey(Boolean(data.hasOpenAiKey));
        if (data.activeProvider) {
          setProvider(data.activeProvider);
        }
      } catch {
        setHasOpenAiKey(false);
      }
    };

    checkApiStatus();

    const bookmarks = getBookmarkedQuestions();
    const ids = new Set(bookmarks.map((b) => b.id || `q-${b.number}`));
    setBookmarkedIds(ids);
  }, []);

  const handleGenerate = async (
    targetTopic: string,
    mode: QuestionType,
    preferredLang?: ResponseLanguage
  ) => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    setTopic(targetTopic);
    setQuestionType(mode);

    // Pass unique generation seed
    const generationSeed = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          typeMode: mode,
          preferredLanguage: preferredLang,
          seed: generationSeed,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate questions. Please try again.');
      }

      const generatedQuestions: Question[] = data.questions;
      setQuestions(generatedQuestions);
      setIsAiGenerated(Boolean(data.isAiGenerated));
      setLanguage(data.language || 'English');
      setHasOpenAiKey(Boolean(data.hasOpenAiKey));
      setProvider(data.provider || 'Structured Demo');

      // Auto-save set to local history
      const newSet: QuestionSet = {
        id: `set-${Date.now()}`,
        topic: targetTopic,
        createdAt: new Date().toISOString(),
        difficultyMode: 'Progressive (1-50)',
        typeMode: mode,
        language: data.language || 'English',
        isAiGenerated: Boolean(data.isAiGenerated),
        questions: generatedQuestions,
      };
      saveQuestionSet(newSet);

      showToast(`Generated 50 questions for "${targetTopic}" via ${data.provider || 'AI'}!`, 'success');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while generating questions.');
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBookmark = (question: Question) => {
    const isNowBookmarked = toggleBookmarkQuestion(question);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      const key = question.id || `q-${question.number}`;
      if (isNowBookmarked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });

    showToast(
      isNowBookmarked ? `Bookmarked Q${question.number}` : `Removed bookmark for Q${question.number}`,
      'info'
    );
  };

  const handleRegenerateQuestion = async (targetQuestion: Question) => {
    try {
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          number: targetQuestion.number,
          difficulty: targetQuestion.difficulty,
          type: targetQuestion.type,
          language: language as ResponseLanguage,
          existingQuestionsSummary: questions.map((q) => q.question),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Regeneration failed');
      }

      const updated = questions.map((q) =>
        q.number === targetQuestion.number ? data.question : q
      );
      setQuestions(updated);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleLoadSavedSet = (savedSet: QuestionSet) => {
    setTopic(savedSet.topic);
    setQuestions(savedSet.questions);
    setQuestionType(savedSet.typeMode);
    setLanguage(savedSet.language);
    setIsAiGenerated(savedSet.isAiGenerated);
    // BUG 13 fix: update provider when loading a saved set
    setProvider(savedSet.isAiGenerated ? 'AI (Saved Set)' : 'Structured Demo (Saved Set)');
  };

  const handleReset = () => {
    setQuestions([]);
    setTopic('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090b10] text-gray-100 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        onOpenSavedSets={() => setIsSavedSetsOpen(true)}
        hasOpenAiKey={hasOpenAiKey}
        activeProvider={provider}
      />

      {/* Main Body */}
      <main className="flex-1">
        {/* Error Alert if any */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs text-rose-300 hover:text-white underline ml-4"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Dynamic View: Loading / Question List / Hero */}
        {isLoading ? (
          <LoadingScreen topic={topic} />
        ) : questions.length > 0 ? (
          <QuestionList
            topic={topic}
            questions={questions}
            questionType={questionType}
            language={language}
            isAiGenerated={isAiGenerated}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onRegenerateQuestion={handleRegenerateQuestion}
            onExplainMore={(q) => setExplainQuestion(q)}
            onReset={handleReset}
            provider={provider}
          />
        ) : (
          <HeroSection onGenerate={handleGenerate} isLoading={isLoading} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            Built with Next.js, TypeScript, Tailwind CSS, Ollama & OpenAI
          </p>
          <p className="text-gray-400 text-[11px]">
            50 Progressive Technical Questions • Beginner to Principal Interview Challenge • English, Hindi & Hinglish
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ExplainModal
        question={explainQuestion}
        topic={topic}
        language={language}
        isOpen={Boolean(explainQuestion)}
        onClose={() => setExplainQuestion(null)}
      />

      <SavedSetsModal
        isOpen={isSavedSetsOpen}
        onClose={() => setIsSavedSetsOpen(false)}
        onLoadSet={handleLoadSavedSet}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
