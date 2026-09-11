'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, Bookmark, Key, Layers, Cpu, Database, Check } from 'lucide-react';
import { getSavedQuestionSets, getBookmarkedQuestions } from '@/lib/storage';

interface HeaderProps {
  onOpenSavedSets: () => void;
  hasOpenAiKey?: boolean;
  activeProvider?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSavedSets,
  hasOpenAiKey = false,
  activeProvider = 'Structured Demo',
}) => {
  const [savedCount, setSavedCount] = useState(0);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(activeProvider);
  const [hasOllama, setHasOllama] = useState(false);
  const [ollamaModel, setOllamaModel] = useState('llama3.2');

  useEffect(() => {
    const updateCounts = () => {
      setSavedCount(getSavedQuestionSets().length);
      setBookmarkCount(getBookmarkedQuestions().length);
    };

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setCurrentProvider(data.activeProvider || activeProvider);
          setHasOllama(Boolean(data.hasOllama));
          if (data.ollamaModel) setOllamaModel(data.ollamaModel);
        }
      } catch {
        // keep defaults
      }
    };

    updateCounts();
    fetchStatus();

    window.addEventListener('storage', updateCounts);
    const interval = setInterval(updateCounts, 2500);
    return () => {
      window.removeEventListener('storage', updateCounts);
      clearInterval(interval);
    };
  }, [activeProvider]);

  const isOllamaActive = currentProvider.toLowerCase().includes('ollama');
  const isOpenAiActive = currentProvider.toLowerCase().includes('openai');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-[#090b10]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/25 ring-1 ring-white/10 hover:shadow-indigo-500/40 transition-all duration-300">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#0d1017] relative">
              <Image
                src="/logo.jpg"
                alt="QuestAI Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover object-center"
                priority
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white font-sans">
                Quest<span className="text-indigo-400">AI</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                PRO 50
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Progressive AI Question Generator
            </p>
          </div>
        </div>

        {/* Status Pill & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* AI Mode Indicator */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              isOpenAiActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : isOllamaActive
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:bg-sky-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Click to view AI engine priority & provider status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOpenAiActive
                  ? 'bg-emerald-400 animate-pulse'
                  : isOllamaActive
                  ? 'bg-sky-400 animate-pulse'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="hidden md:inline">
              {isOpenAiActive
                ? 'AI Mode — OpenAI'
                : isOllamaActive
                ? `AI Mode — Ollama (${ollamaModel})`
                : 'Structured Demo Mode'}
            </span>
            <span className="md:hidden">
              {isOpenAiActive ? 'OpenAI' : isOllamaActive ? 'Ollama' : 'Demo'}
            </span>
            <Key className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          {/* Saved Sets Button */}
          <button
            onClick={onOpenSavedSets}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-surface-100 hover:bg-surface-200 border border-white/10 text-gray-200 hover:text-white transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Saved Sets</span>
            {savedCount > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-bold">
                {savedCount}
              </span>
            )}
            {bookmarkCount > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 text-amber-400 text-[11px] ml-1">
                <Bookmark className="w-3 h-3 fill-amber-400" /> {bookmarkCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Provider Architecture Info Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121622] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                AI Generation Architecture
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                3-Tier Priority
              </span>
            </div>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              QuestAI uses a robust 3-tier waterfall priority to ensure 100% availability without interruptions:
            </p>

            <div className="space-y-2.5 text-xs">
              {/* Priority 1 */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isOpenAiActive
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-surface-50 border-white/5 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${isOpenAiActive ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  <div>
                    <div className="font-semibold text-white">Priority 1: OpenAI (Cloud)</div>
                    <div className="text-[11px] text-gray-400">gpt-4o-mini via official OpenAI SDK</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5">
                  {isOpenAiActive ? 'Active' : 'Not Configured'}
                </span>
              </div>

              {/* Priority 2 */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isOllamaActive
                    ? 'bg-sky-950/40 border-sky-500/40 text-sky-200'
                    : hasOllama
                    ? 'bg-sky-950/20 border-sky-500/20 text-gray-300'
                    : 'bg-surface-50 border-white/5 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${isOllamaActive ? 'bg-sky-400 animate-pulse' : hasOllama ? 'bg-sky-600' : 'bg-gray-600'}`} />
                  <div>
                    <div className="font-semibold text-white">Priority 2: Ollama ({ollamaModel})</div>
                    <div className="text-[11px] text-gray-400">Local private AI inference (zero cost)</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5">
                  {isOllamaActive ? 'Active Provider' : hasOllama ? 'Available (Standby)' : 'Daemon Offline'}
                </span>
              </div>

              {/* Priority 3 */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  !isOpenAiActive && !isOllamaActive
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-surface-50 border-white/5 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${!isOpenAiActive && !isOllamaActive ? 'bg-amber-400' : 'bg-gray-600'}`} />
                  <div>
                    <div className="font-semibold text-white">Priority 3: Structured Demo Fallback</div>
                    <div className="text-[11px] text-gray-400">Instant combinatorial question engine</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5">
                  {!isOpenAiActive && !isOllamaActive ? 'Active' : 'Standby'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-50 border border-white/5 space-y-1.5 text-xs text-gray-300">
              <div className="text-gray-400 font-mono"># Setup OpenAI API key in .env.local:</div>
              <div className="p-2 rounded bg-black/60 text-emerald-400 font-mono select-all text-[11px]">
                OPENAI_API_KEY=sk-proj-...
              </div>
            </div>

            <button
              onClick={() => setShowKeyModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
