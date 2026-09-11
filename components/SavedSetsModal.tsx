'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, ArrowUpRight, Bookmark, Layers, Calendar, HelpCircle, CheckCircle2 } from 'lucide-react';
import { QuestionSet, Question } from '@/lib/types';
import { getSavedQuestionSets, deleteSavedSet, getBookmarkedQuestions } from '@/lib/storage';
import { useToast } from './Toast';

interface SavedSetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSet: (set: QuestionSet) => void;
}

export const SavedSetsModal: React.FC<SavedSetsModalProps> = ({
  isOpen,
  onClose,
  onLoadSet,
}) => {
  const [activeTab, setActiveTab] = useState<'sets' | 'bookmarks'>('sets');
  const [savedSets, setSavedSets] = useState<QuestionSet[]>([]);
  const [bookmarks, setBookmarks] = useState<Question[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSavedSets(getSavedQuestionSets());
      setBookmarks(getBookmarkedQuestions());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteSet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSavedSet(id);
    setSavedSets(updated);
    showToast('Deleted saved set', 'info');
  };

  const handleSelectSet = (set: QuestionSet) => {
    onLoadSet(set);
    onClose();
    showToast(`Loaded ${set.topic} (50 questions)`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101420] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-surface-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Saved Generations & Bookmarks</h3>
              <p className="text-xs text-gray-400">Stored locally in your browser</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 flex gap-2 border-b border-white/5 bg-surface-50/30">
          <button
            onClick={() => setActiveTab('sets')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'sets'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Question Sets ({savedSets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'bookmarks'
                ? 'border-amber-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Bookmarked Questions ({bookmarks.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {activeTab === 'sets' ? (
            savedSets.length === 0 ? (
              <div className="py-14 text-center text-gray-400 text-xs">
                No question sets saved yet. Generate any topic to save sets automatically!
              </div>
            ) : (
              savedSets.map((set) => (
                <div
                  key={set.id}
                  onClick={() => handleSelectSet(set)}
                  className="p-4 rounded-2xl bg-surface-50/80 hover:bg-surface-100 border border-white/5 hover:border-indigo-500/40 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors">
                        {set.topic}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {set.questions.length} questions
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400">
                        {set.typeMode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(set.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>Language: {set.language}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteSet(set.id, e)}
                      className="p-2 rounded-xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Delete set"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-2 rounded-xl bg-white/5 text-gray-300 group-hover:text-white group-hover:bg-indigo-600 transition-all">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            bookmarks.length === 0 ? (
              <div className="py-14 text-center text-gray-400 text-xs">
                No questions bookmarked yet. Click the bookmark icon on any question card to save it here.
              </div>
            ) : (
              bookmarks.map((b) => (
                <div
                  key={b.id || b.number}
                  className="p-4 rounded-2xl bg-surface-50 border border-white/5 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-indigo-400 font-bold">
                      Q{b.number} • {b.difficulty}
                    </span>
                    <span className="text-gray-400">{b.type}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-200 font-medium">{b.question}</p>
                  <p className="text-xs text-emerald-400/90 font-medium">Answer: {b.correctAnswer}</p>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-surface-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-white text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
