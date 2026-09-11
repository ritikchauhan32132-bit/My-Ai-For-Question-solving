'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Download,
  Copy,
  FileText,
  Layers,
  ChevronDown,
  Sparkles,
  Bookmark,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { Question, QuestionType, DifficultyLevel } from '@/lib/types';
import { QuestionCard } from './QuestionCard';
import { generateQuestionsPDF, exportQuestionsJSON, exportQuestionsMarkdown } from '@/lib/pdf';
import { useToast } from './Toast';

interface QuestionListProps {
  topic: string;
  questions: Question[];
  questionType: QuestionType;
  language: string;
  isAiGenerated: boolean;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (q: Question) => void;
  onRegenerateQuestion: (q: Question) => Promise<void>;
  onExplainMore: (q: Question) => void;
  onReset: () => void;
  provider?: string;
}

type FilterOption = 'All' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Challenge' | 'MCQ' | 'Coding' | 'Conceptual' | 'Interview' | 'Bookmarked';

export const QuestionList: React.FC<QuestionListProps> = ({
  topic,
  questions,
  questionType,
  language,
  isAiGenerated,
  bookmarkedIds,
  onToggleBookmark,
  onRegenerateQuestion,
  onExplainMore,
  onReset,
  provider = 'Structured Demo',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const { showToast } = useToast();
  const pdfMenuRef = useRef<HTMLDivElement>(null);

  // Close PDF dropdown on outside click (BUG 9 fix)
  useEffect(() => {
    if (!showPdfMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setShowPdfMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPdfMenu]);

  // Filter & Search Logic
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Filter tab check
      if (activeFilter === 'Bookmarked') {
        const isBm = bookmarkedIds.has(q.id) || bookmarkedIds.has(`q-${q.number}`);
        if (!isBm) return false;
      } else if (activeFilter !== 'All') {
        const isDifficulty = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Challenge'].includes(activeFilter);
        if (isDifficulty && q.difficulty !== activeFilter) {
          return false;
        }
        const isType = ['MCQ', 'Coding', 'Conceptual', 'Interview'].includes(activeFilter);
        if (isType && q.type !== activeFilter) {
          return false;
        }
      }

      // Search term check
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const inQuestion = q.question.toLowerCase().includes(term);
        const inExplanation = q.explanation.toLowerCase().includes(term);
        const inConcept = (q.expectedConcept || '').toLowerCase().includes(term);
        const inTags = q.tags.some(t => t.toLowerCase().includes(term));
        const inAnswer = (q.correctAnswer || '').toLowerCase().includes(term);
        return inQuestion || inExplanation || inConcept || inTags || inAnswer;
      }

      return true;
    });
  }, [questions, activeFilter, searchTerm, bookmarkedIds]);

  const handleCopyAll = async () => {
    try {
      const md = exportQuestionsMarkdown(topic, questions, true);
      await navigator.clipboard.writeText(md);
      showToast('Copied all 50 questions & answers in Markdown!', 'success');
    } catch {
      showToast('Failed to copy questions', 'error');
    }
  };

  const handleDownloadPdf = (includeAnswers: boolean) => {
    setShowPdfMenu(false);
    try {
      generateQuestionsPDF(topic, questions, includeAnswers);
      showToast(
        includeAnswers
          ? 'Generating PDF with Questions & Explanations...'
          : 'Generating Questions-only PDF...',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to export PDF', 'error');
    }
  };

  const handleDownloadJson = () => {
    try {
      exportQuestionsJSON(topic, questions);
      showToast('Exported questions JSON file!', 'success');
    } catch {
      showToast('Failed to export JSON', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb / Reset Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Generate for Another Topic</span>
        </button>

        {/* AI status badge for current set */}
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            provider.toLowerCase().includes('openai')
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : provider.toLowerCase().includes('ollama')
              ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            {provider}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
            {language}
          </span>
        </div>
      </div>

      {/* Main Result Banner / Summary Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Topic Title & Metrics */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                50 Questions Generated
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                Mode: {questionType}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {topic}
            </h2>

            {/* Progressive Difficulty Indicator Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-gray-400 font-medium">Difficulty Distribution:</span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  1–10: Beginner
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  11–20: Intermediate
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  21–35: Advanced
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  36–45: Expert
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                  46–50: Challenge
                </span>
              </div>
            </div>
          </div>

          {/* Bulk Export Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Copy All */}
            <button
              onClick={handleCopyAll}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-100 hover:bg-surface-200 border border-white/10 text-gray-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
              title="Copy all 50 questions with answers in Markdown"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Copy All</span>
            </button>

            {/* Download PDF Dropdown */}
            <div className="relative" ref={pdfMenuRef}>
              <button
                onClick={() => setShowPdfMenu(!showPdfMenu)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
                <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
              </button>

              {showPdfMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#141926] border border-white/15 p-2 shadow-2xl z-30 space-y-1">
                  <button
                    onClick={() => handleDownloadPdf(false)}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-surface-200 text-gray-200 hover:text-white transition-all flex flex-col"
                  >
                    <span className="font-semibold text-indigo-300">Download Questions Only</span>
                    <span className="text-[10px] text-gray-400">Great for mock tests & practice</span>
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(true)}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-surface-200 text-gray-200 hover:text-white transition-all flex flex-col"
                  >
                    <span className="font-semibold text-emerald-400">Download Questions + Answers</span>
                    <span className="text-[10px] text-gray-400">Includes complete explanations</span>
                  </button>
                </div>
              )}
            </div>

            {/* Download JSON */}
            <button
              onClick={handleDownloadJson}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-100 hover:bg-surface-200 border border-white/10 text-gray-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
              title="Export raw JSON"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search across questions, tags, concepts or explanations..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-50 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Results Count */}
          <div className="text-xs text-gray-400 px-1 shrink-0 font-medium">
            Showing <strong className="text-white font-bold">{filteredQuestions.length}</strong> of 50 questions
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(
            [
              'All',
              'Beginner',
              'Intermediate',
              'Advanced',
              'Expert',
              'Challenge',
              'Coding',
              'MCQ',
              'Conceptual',
              'Interview',
              'Bookmarked',
            ] as FilterOption[]
          ).map((filter) => {
            const isActive = activeFilter === filter;
            // Compute count for each filter tab (BUG 10 fix)
            const count = filter === 'All'
              ? questions.length
              : filter === 'Bookmarked'
              ? questions.filter(q => bookmarkedIds.has(q.id) || bookmarkedIds.has(`q-${q.number}`)).length
              : ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Challenge'].includes(filter)
              ? questions.filter(q => q.difficulty === filter).length
              : questions.filter(q => q.type === filter).length;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-sm'
                    : 'bg-surface-50/80 hover:bg-surface-100 border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {filter === 'Bookmarked' ? `★ Bookmarked` : filter}
                {count > 0 && (
                  <span className={`ml-1.5 text-[10px] font-mono ${
                    isActive ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Cards Grid */}
      {filteredQuestions.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-white/10">
          <p className="text-gray-400 text-sm mb-2">No questions matched your current search or filter.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setActiveFilter('All');
            }}
            className="text-xs font-semibold text-indigo-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id || q.number}
              question={q}
              topic={topic}
              isBookmarked={bookmarkedIds.has(q.id) || bookmarkedIds.has(`q-${q.number}`)}
              onToggleBookmark={onToggleBookmark}
              onRegenerateQuestion={onRegenerateQuestion}
              onExplainMore={onExplainMore}
            />
          ))}
        </div>
      )}
    </div>
  );
};
