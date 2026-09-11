'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, Sparkles, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

interface LoadingScreenProps {
  topic: string;
}

const STAGES = [
  { label: 'Analyzing topic & conceptual taxonomy...', duration: 1500 },
  { label: 'Designing real-world questions & scenarios...', duration: 2200 },
  { label: 'Balancing progressive difficulty (1-50)...', duration: 2000 },
  { label: 'Validating uniqueness & finalizing set...', duration: 1500 },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ topic }) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 1800);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 94) return prev;
        const jump = Math.floor(Math.random() * 5) + 3;
        return Math.min(prev + jump, 94);
      });
    }, 250);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="py-20 px-4 max-w-xl mx-auto text-center">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
        {/* Animated ambient background pulse */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 animate-pulse-slow pointer-events-none" />

        {/* Central glowing icon */}
        <div className="relative mx-auto w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-xl shadow-indigo-500/30 flex items-center justify-center">
          <div className="w-full h-full bg-[#0d1017] rounded-[15px] flex items-center justify-center">
            <Zap className="w-10 h-10 text-indigo-400 animate-bounce" />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Generating 50 Questions
        </h3>
        <p className="text-sm text-gray-400 mb-6 font-mono">
          Topic: <span className="text-indigo-300 font-semibold">{topic}</span>
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-surface-50 rounded-full h-2.5 mb-6 overflow-hidden border border-white/5">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stages Checklist */}
        <div className="space-y-3 text-left max-w-md mx-auto">
          {STAGES.map((stage, idx) => {
            const isDone = idx < currentStage;
            const isCurrent = idx === currentStage;

            return (
              <div
                key={stage.label}
                className={`flex items-center gap-3 p-2 rounded-xl transition-all duration-300 ${
                  isCurrent
                    ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-200'
                    : isDone
                    ? 'text-emerald-400 opacity-80'
                    : 'text-gray-500 opacity-40'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-600 shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-medium">
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Curating 1–10 Beginner to 46–50 Challenge tiers</span>
        </div>
      </div>
    </div>
  );
};
