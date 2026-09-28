import React from 'react';
import { GitBranch, ShieldCheck, Sparkles, Layers, FileCode, CheckCircle2, Settings, Cpu, Cloud } from 'lucide-react';
import { ApiSettings } from '../types';

interface HeaderProps {
  currentStep: number;
  onSelectStep: (step: number) => void;
  reposCount: number;
  featuresCount: number;
  hasIdeas: boolean;
  hasPlan: boolean;
  openCodeReviewVersion: string;
  apiSettings?: ApiSettings;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onSelectStep,
  reposCount,
  featuresCount,
  hasIdeas,
  hasPlan,
  openCodeReviewVersion,
  apiSettings,
}) => {
  const isCustom = apiSettings?.provider === 'custom_openai';

  const steps = [
    { number: 1, label: 'Repos & Ingestion', count: reposCount > 0 ? `${reposCount} repos` : undefined },
    { number: 2, label: 'Master Feature Matrix', count: featuresCount > 0 ? `${featuresCount} features` : undefined },
    { number: 3, label: '3 Synthesized Apps', isReady: featuresCount > 0 },
    { number: 4, label: 'Roadmap & Agent Plan', isReady: hasPlan },
    { number: 5, label: 'OpenCodeReview Studio', badge: 'Active' },
    { number: 6, label: 'Settings & API Provider', icon: Settings },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-white text-base">GitCraft Studio</span>
                <span className="text-slate-600 font-mono text-xs">/</span>
                <span className="text-emerald-400 font-medium text-xs tracking-wide">Synthesizer</span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-Repo Feature Harvester · App Combiner · Coding Agent Planner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Active AI Provider Status Indicator */}
            <button
              onClick={() => onSelectStep(6)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                isCustom
                  ? 'bg-sky-950/80 border-sky-500/40 text-sky-300 hover:bg-sky-900/80'
                  : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60'
              }`}
              title="Click to configure API Key, URL or change models"
            >
              {isCustom ? (
                <>
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  <span className="truncate max-w-[130px]">{apiSettings?.openaiModel || 'Custom API'}</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gemini 3.8</span>
                </>
              )}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            {/* Alibaba OpenCodeReview Status Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-medium">OpenCodeReview</span>
              <span className="text-slate-500 font-mono">v{openCodeReviewVersion || '1.12.10'}</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                CLI Armed
              </span>
            </div>
          </div>
        </div>

        {/* Step Navigation Bar */}
        <div className="flex items-center space-x-1 sm:space-x-2 py-2.5 overflow-x-auto border-t border-slate-800/60 no-scrollbar">
          {steps.map((step) => {
            const isActive = currentStep === step.number;
            const isCompleted =
              (step.number === 1 && reposCount > 0) ||
              (step.number === 2 && featuresCount > 0) ||
              (step.number === 3 && hasIdeas) ||
              (step.number === 4 && hasPlan);

            return (
              <button
                key={step.number}
                onClick={() => onSelectStep(step.number)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-mono ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : isCompleted
                      ? 'bg-slate-800 text-emerald-400'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {isCompleted && !isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.number}
                </span>
                <span>{step.label}</span>
                {step.count && (
                  <span className="text-[11px] font-mono text-slate-500">{step.count}</span>
                )}
                {step.badge && (
                  <span className="text-[10px] text-emerald-400 font-mono uppercase">{step.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
