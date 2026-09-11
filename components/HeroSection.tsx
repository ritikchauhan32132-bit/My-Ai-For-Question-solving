'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowRight, Layers, Lock, Cpu, Globe, CheckCircle } from 'lucide-react';
import { QuestionType, ResponseLanguage } from '@/lib/types';

interface HeroSectionProps {
  onGenerate: (topic: string, typeMode: QuestionType, language?: ResponseLanguage) => void;
  isLoading: boolean;
}

const EXAMPLE_TOPICS = [
  'Python OOP',
  'Java DSA',
  'SQL',
  'Machine Learning',
  'Data Science',
  'DBMS',
  'Operating System',
  'React'
];

const HINDI_HINGLISH_EXAMPLES = [
  'Python OOP ke 50 interview questions do',
  'DBMS beginner se advanced tak questions',
  'Java inheritance ko Hindi me samjhao',
  'Data Science interview questions in Hinglish'
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onGenerate, isLoading }) => {
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('Mixed');
  const [preferredLang, setPreferredLang] = useState<ResponseLanguage | 'Auto'>('Auto');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    onGenerate(
      topic.trim(),
      questionType,
      preferredLang === 'Auto' ? undefined : preferredLang
    );
  };

  const handleExampleClick = (example: string) => {
    if (isLoading) return;
    setTopic(example);
  };

  return (
    <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Trained for Tech Interviews & Conceptual Mastery</span>
      </div>

      {/* Main Headings */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
        AI Question <span className="text-gradient-brand">Generator</span>
      </h1>
      <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto font-normal mb-8 leading-relaxed">
        Turn any topic into <span className="text-indigo-400 font-semibold">50 progressively challenging questions</span>.
      </p>

      {/* Topic Input Box Form */}
      <form onSubmit={handleSubmit} className="relative z-10 max-w-3xl mx-auto mb-6">
        <div className="glass-panel p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-white/10 hover:border-indigo-500/40 transition-all focus-within:border-indigo-500/60 focus-within:ring-4 focus-within:ring-indigo-500/10">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1 flex items-center">
              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter your topic... e.g. Python OOP"
                disabled={isLoading}
                className="w-full px-4 py-3.5 pr-8 bg-transparent text-white placeholder-gray-400 text-base sm:text-lg focus:outline-none"
              />
              {topic && !isLoading && (
                <button
                  type="button"
                  onClick={() => setTopic('')}
                  className="absolute right-2 text-xs px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  title="Clear input"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              id="generate-btn"
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate 50 Questions</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Controls Bar: Count (Fixed 50), Difficulty, Question Type, Language */}
          <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300 px-2">
            {/* Left Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Fixed Question Count */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-gray-300 font-medium">
                <Lock className="w-3 h-3 text-indigo-400" />
                <span>Count: <strong className="text-white font-bold">50 Questions</strong></span>
              </div>

              {/* Question Type Selector */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Type:</span>
                <div className="inline-flex bg-surface-50 p-0.5 rounded-lg border border-white/5">
                  {(['Mixed', 'Interview', 'MCQ', 'Coding', 'Conceptual'] as QuestionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setQuestionType(type)}
                      className={`px-2.5 py-1 rounded-md transition-all text-xs ${
                        questionType === type
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-gray-400">Language:</span>
              <div className="inline-flex bg-surface-50 p-0.5 rounded-lg border border-white/5">
                {(['Auto', 'English', 'Hinglish', 'Hindi'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setPreferredLang(lang)}
                    className={`px-2 py-0.5 rounded-md transition-all text-[11px] ${
                      preferredLang === lang
                        ? 'bg-purple-600/90 text-white font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Example Topics Chips */}
      <div className="relative z-10 max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
          <span>Popular Topics:</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {EXAMPLE_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => handleExampleClick(t)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-50 hover:bg-surface-200 border border-white/5 hover:border-indigo-500/40 text-gray-300 hover:text-white transition-all transform hover:-translate-y-0.5"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Hindi & Hinglish Prompt Suggestions */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <span className="text-indigo-400 font-semibold mr-1">Hindi / Hinglish prompts:</span>
          {HINDI_HINGLISH_EXAMPLES.map((h) => (
            <button
              key={h}
              onClick={() => handleExampleClick(h)}
              className="px-2.5 py-1 rounded-lg bg-surface-50/50 hover:bg-surface-100 border border-indigo-500/20 text-indigo-200/80 hover:text-indigo-100 hover:border-indigo-400/40 transition-all italic"
            >
              &ldquo;{h}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
