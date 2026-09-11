'use client';

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Copy,
  Bookmark,
  RefreshCw,
  Sparkles,
  Check,
  Code2,
  HelpCircle,
  BrainCircuit,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Question, DifficultyLevel } from '@/lib/types';
import { useToast } from './Toast';

interface QuestionCardProps {
  question: Question;
  topic: string;
  isBookmarked: boolean;
  onToggleBookmark: (q: Question) => void;
  onRegenerateQuestion: (q: Question) => Promise<void>;
  onExplainMore: (q: Question) => void;
}

const DIFFICULTY_STYLES: Record<DifficultyLevel, { label: string; badge: string; border: string }> = {
  Beginner: {
    label: 'Beginner',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    border: 'hover:border-emerald-500/30'
  },
  Intermediate: {
    label: 'Intermediate',
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    border: 'hover:border-sky-500/30'
  },
  Advanced: {
    label: 'Advanced',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    border: 'hover:border-indigo-500/30'
  },
  Expert: {
    label: 'Expert',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    border: 'hover:border-purple-500/30'
  },
  Challenge: {
    label: 'Interview Challenge',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse-slow',
    border: 'hover:border-rose-500/30'
  },
};

const TYPE_ICONS = {
  MCQ: HelpCircle,
  Coding: Code2,
  Conceptual: BrainCircuit,
  Interview: MessageSquare,
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  topic,
  isBookmarked,
  onToggleBookmark,
  onRegenerateQuestion,
  onExplainMore,
}) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const { showToast } = useToast();

  const diffStyle = DIFFICULTY_STYLES[question.difficulty] || DIFFICULTY_STYLES.Beginner;
  const TypeIcon = TYPE_ICONS[question.type] || HelpCircle;

  const handleCopy = async () => {
    const textToCopy = `Q${question.number} [${question.difficulty} • ${question.type}]: ${question.question}\n\n${
      question.options && question.options.length > 0 ? question.options.join('\n') + '\n\n' : ''
    }Answer: ${question.correctAnswer}\n\nExplanation: ${question.explanation}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setHasCopied(true);
      showToast(`Copied Q${question.number} to clipboard!`, 'success');
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      await onRegenerateQuestion(question);
      showToast(`Regenerated Q${question.number}`, 'success');
    } catch {
      showToast('Failed to regenerate question', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (showAnswer) {
      // If answer is already revealed, allow changing selection
      setSelectedOption(option);
      return;
    }
    if (selectedOption === option) {
      // Second click on same option reveals the answer
      setShowAnswer(true);
    } else {
      // First click just selects the option (no auto-reveal)
      setSelectedOption(option);
    }
  };

  const isOptionCorrect = (opt: string, ans?: string): boolean => {
    if (!ans) return false;
    const cleanAns = ans.trim();
    const cleanOpt = opt.trim();
    if (cleanOpt === cleanAns) return true;
    const optLetterMatch = cleanOpt.match(/^([A-Da-d])[\.\:\-\)\s]/);
    const ansLetterMatch = cleanAns.match(/^([A-Da-d])(?:[\.\:\-\)\s]|$)/);
    if (optLetterMatch && ansLetterMatch && optLetterMatch[1].toUpperCase() === ansLetterMatch[1].toUpperCase()) {
      return true;
    }
    const optContent = cleanOpt.replace(/^([A-Da-d][\.\:\-\)\s]+)/, '').trim().toLowerCase();
    const ansContent = cleanAns.replace(/^([A-Da-d][\.\:\-\)\s]+)/, '').trim().toLowerCase();
    if (optContent && ansContent && (optContent === ansContent || optContent.includes(ansContent) || ansContent.includes(optContent))) {
      return true;
    }
    return false;
  };

  return (
    <div
      id={`question-${question.number}`}
      className={`glass-card p-5 sm:p-6 rounded-2xl relative transition-all duration-300 ${diffStyle.border}`}
    >
      {/* Top Header Bar: Number, Difficulty, Type, Tags */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center gap-2">
          {/* Number Pill */}
          <span className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono font-bold text-gray-200">
            #{question.number.toString().padStart(2, '0')}
          </span>

          {/* Difficulty Badge */}
          <span className={`px-2.5 py-0.8 rounded-lg text-xs font-semibold border ${diffStyle.badge}`}>
            {diffStyle.label}
          </span>

          {/* Type Badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-lg text-xs font-medium bg-surface-50 text-gray-300 border border-white/5">
            <TypeIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>{question.type}</span>
          </span>
        </div>

        {/* Expected Concept Tag */}
        {question.expectedConcept && (
          <span className="text-[11px] font-mono text-gray-400 bg-white/[0.03] px-2 py-0.5 rounded border border-white/5 hidden sm:inline-block">
            {question.expectedConcept}
          </span>
        )}
      </div>

      {/* Question Text */}
      <div className="text-base sm:text-[17px] font-medium text-white leading-relaxed mb-4">
        {question.question}
      </div>

      {/* Code Snippet Box (if any) */}
      {question.codeSnippet && (
        <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-[#07090e]">
          <div className="px-3.5 py-1.5 bg-[#0e121c] border-b border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>Code snippet / starter block</span>
            <span className="text-indigo-400">{question.expectedConcept || 'Code'}</span>
          </div>
          <pre className="p-4 text-xs sm:text-sm font-mono text-indigo-200 overflow-x-auto leading-relaxed">
            <code>{question.codeSnippet}</code>
          </pre>
        </div>
      )}

      {/* MCQ Options (A, B, C, D) */}
      {question.options && question.options.length > 0 && (
        <div className="space-y-2 mb-4">
          {question.options.map((opt, idx) => {
            const isSelected = selectedOption === opt;
            const isCorrect = showAnswer && isOptionCorrect(opt, question.correctAnswer);
            const isWrong = showAnswer && isSelected && !isCorrect;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleOptionSelect(opt)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all flex items-center justify-between ${
                  isCorrect
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 shadow-sm shadow-emerald-900/20'
                    : isWrong
                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
                    : isSelected
                    ? 'bg-indigo-950/50 border-indigo-500/50 text-indigo-200'
                    : 'bg-surface-50/70 hover:bg-surface-100 border-white/5 text-gray-300 hover:text-white'
                }`}
              >
                <span>{opt}</span>
                {isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Answer & Explanation Box (Toggleable) */}
      {showAnswer && (
        <div className="mt-4 p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 animate-fadeIn space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Check className="w-4 h-4" />
            <span>Correct Answer:</span>
            <span className="text-white font-normal">{question.correctAnswer}</span>
          </div>

          <div>
            <span className="text-xs font-semibold text-indigo-300 block mb-1">Explanation:</span>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              {question.explanation}
            </p>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
        {/* Left Side: Show Answer Button */}
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            showAnswer
              ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
              : 'bg-surface-50 hover:bg-surface-200 border-white/10 text-gray-300 hover:text-white'
          }`}
        >
          {showAnswer ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hide Answer</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Show Answer</span>
            </>
          )}
        </button>

        {/* Right Side: Copy, Regenerate, Bookmark, Explain More */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Copy Question */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-surface-50 hover:bg-surface-200 border border-white/5 text-gray-400 hover:text-white transition-all text-xs"
            title="Copy Question"
          >
            {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Regenerate Question */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="p-2 rounded-lg bg-surface-50 hover:bg-surface-200 border border-white/5 text-gray-400 hover:text-indigo-300 transition-all text-xs disabled:opacity-50"
            title="Regenerate this question with AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Bookmark */}
          <button
            onClick={() => onToggleBookmark(question)}
            className={`p-2 rounded-lg border transition-all text-xs ${
              isBookmarked
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-surface-50 hover:bg-surface-200 border-white/5 text-gray-400 hover:text-white'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Explain More AI Action */}
          <button
            onClick={() => onExplainMore(question)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-500 hover:to-purple-500 text-white border border-indigo-400/30 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>Explain More</span>
          </button>
        </div>
      </div>
    </div>
  );
};
