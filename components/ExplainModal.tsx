'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Code2, Lightbulb, AlertOctagon, CheckCircle2, Copy, Check } from 'lucide-react';
import { Question } from '@/lib/types';
import { useToast } from './Toast';

interface ExplainModalProps {
  question: Question | null;
  topic: string;
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

interface DeepDiveData {
  deepDiveExplanation: string;
  codeExample: string;
  interviewTips: string[];
  commonMistakes: string[];
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  question,
  topic,
  isOpen,
  onClose,
  language,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DeepDiveData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen || !question) {
      setData(null);
      return;
    }

    const fetchExplanation = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            topic,
            language,
          }),
        });
        const json = await res.json();
        if (json.success) {
          setData({
            deepDiveExplanation: json.deepDiveExplanation,
            codeExample: json.codeExample,
            interviewTips: json.interviewTips || [],
            commonMistakes: json.commonMistakes || [],
          });
        } else {
          showToast(json.error || 'Failed to generate explanation', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Network error while requesting explanation', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, question, topic, language]);

  if (!isOpen || !question) return null;

  const handleCopyCode = async () => {
    if (!data?.codeExample) return;
    try {
      await navigator.clipboard.writeText(data.codeExample);
      setCopiedCode(true);
      showToast('Copied code to clipboard!', 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101420] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-surface-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                AI Deep-Dive Explanation
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Q{question.number}
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                {question.difficulty} • {question.type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Question Summary Banner */}
          <div className="p-4 rounded-2xl bg-surface-50 border border-white/5">
            <span className="text-xs font-semibold text-indigo-400 block mb-1">Question</span>
            <p className="text-sm text-gray-200 font-medium">{question.question}</p>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-300 font-medium">
                Synthesizing architectural breakdown & interview strategies...
              </p>
            </div>
          ) : data ? (
            <>
              {/* Comprehensive Theory */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-indigo-400" />
                  Conceptual Deep Dive
                </h4>
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line bg-surface-50/50 p-4 rounded-2xl border border-white/5">
                  {data.deepDiveExplanation}
                </div>
              </div>

              {/* Code Example */}
              {data.codeExample && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-emerald-400" />
                      Production Code Implementation
                    </h4>
                    <button
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-[#06080e] border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                    <code>{data.codeExample}</code>
                  </pre>
                </div>
              )}

              {/* Interview Tips & Traps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Interview Tips */}
                {data.interviewTips.length > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                    <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Pro Interview Tips
                    </h5>
                    <ul className="space-y-1.5 text-xs text-emerald-100/80 list-disc list-inside">
                      {data.interviewTips.map((tip, idx) => (
                        <li key={idx} className="leading-relaxed">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Common Pitfalls */}
                {data.commonMistakes.length > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                    <h5 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                      Common Candidate Traps
                    </h5>
                    <ul className="space-y-1.5 text-xs text-rose-100/80 list-disc list-inside">
                      {data.commonMistakes.map((mistake, idx) => (
                        <li key={idx} className="leading-relaxed">{mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-surface-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-white text-xs font-semibold transition-all"
          >
            Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
};
