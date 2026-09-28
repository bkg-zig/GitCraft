import React, { useState } from 'react';
import { AppIdea, GeneratedPlan, CodingTask } from '../types';
import {
  Calendar,
  CheckSquare,
  FileText,
  Bot,
  Copy,
  Download,
  Check,
  Shield,
  Layers,
  Sparkles,
  GitBranch,
  Terminal,
  ExternalLink,
  Code2,
  FolderTree,
} from 'lucide-react';

interface FullPlanSectionProps {
  idea: AppIdea;
  plan: GeneratedPlan;
  onUpdateTasks: (tasks: CodingTask[]) => void;
  onNavigateToReviewer: () => void;
  onBackToIdeas: () => void;
}

export const FullPlanSection: React.FC<FullPlanSectionProps> = ({
  idea,
  plan,
  onUpdateTasks,
  onNavigateToReviewer,
  onBackToIdeas,
}) => {
  const [activeTab, setActiveTab] = useState<
    'roadmap' | 'tasks' | 'progress' | 'agentPlan' | 'ocrConfig' | 'structure'
  >('roadmap');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = (content: string, filename: string, mimeType: string = 'text/markdown') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleTaskCompletion = (taskId: string) => {
    const updated = plan.tasksPlan.map((t) =>
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    onUpdateTasks(updated);
  };

  const completedTasksCount = plan.tasksPlan.filter((t) => t.isCompleted).length;
  const totalStoryPoints = plan.tasksPlan.reduce((acc, t) => acc + (t.storyPoints || 0), 0);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span>SELECTED SYNTHESIS</span>
              <span className="text-slate-600">·</span>
              <span>ENGINEERING BLUEPRINT</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {idea.title}
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              {idea.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onBackToIdeas}
              className="px-3 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              ← Change Idea
            </button>
            <button
              onClick={onNavigateToReviewer}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>OpenCodeReview Studio</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Roadmap</span>
            <span className="text-slate-200 font-semibold">{plan.roadmap.length} Engineering Phases</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Coding Tasks</span>
            <span className="text-slate-200 font-semibold">
              {completedTasksCount} / {plan.tasksPlan.length} Done ({totalStoryPoints} pts)
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Quality Backbone</span>
            <span className="text-emerald-400 font-semibold">@alibaba-group/open-code-review</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Autonomous Plan</span>
            <span className="text-slate-200 font-semibold">Ready for Cursor / Devin</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Interactive Segmented Control) */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('roadmap')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'roadmap'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Interactive Roadmap ({plan.roadmap.length} Phases)</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'tasks'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Coding Tasks Plan ({plan.tasksPlan.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'progress'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>PROGRESS.md</span>
        </button>

        <button
          onClick={() => setActiveTab('agentPlan')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'agentPlan'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Agent Coding Plan (Prompt)</span>
        </button>

        <button
          onClick={() => setActiveTab('ocrConfig')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'ocrConfig'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>OpenCodeReview CI/CD</span>
        </button>

        <button
          onClick={() => setActiveTab('structure')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'structure'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Folder Structure & Files ({plan.appConfig?.primaryLanguage?.toUpperCase() || 'STRUCTURE'})</span>
        </button>
      </div>

      {/* TAB 1: ROADMAP */}
      {activeTab === 'roadmap' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>5-Phase Architecture & Delivery Schedule</span>
            <span>Includes OpenCodeReview verification gate at each phase</span>
          </div>

          <div className="space-y-4">
            {plan.roadmap.map((phase) => (
              <div
                key={phase.phaseNumber}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 font-mono">
                      P{phase.phaseNumber}
                    </span>
                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {phase.phaseName}
                      </h4>
                      <span className="text-xs text-slate-400">{phase.objective}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400/90 self-start sm:self-auto bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                    Duration: {phase.duration}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Milestones */}
                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                      Key Milestones
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {phase.keyMilestones.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-mono">›</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Deliverables */}
                  <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                      Deliverables
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {phase.deliverables.map((d, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-mono">›</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Risk mitigation */}
                <div className="text-xs p-2.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800/80 flex items-start gap-2">
                  <span className="font-semibold text-amber-400 font-mono uppercase text-[10px] whitespace-nowrap mt-0.5">
                    Risk Mitigation:
                  </span>
                  <span className="text-slate-300">{phase.riskMitigation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED CODING TASKS PLAN */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 font-mono">
              Engineering Task Backlog · {completedTasksCount} of {plan.tasksPlan.length} tasks completed ({totalStoryPoints} total story points)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleCopy(
                    JSON.stringify(plan.tasksPlan, null, 2),
                    'tasks-json'
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-slate-800 text-slate-300 hover:text-white"
              >
                {copiedKey === 'tasks-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Backlog JSON</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {plan.tasksPlan.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  task.isCompleted
                    ? 'bg-slate-950/40 border-slate-800 opacity-60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => toggleTaskCompletion(task.id)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      {task.isCompleted ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <CheckSquare className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          {task.id}
                        </span>
                        <span className="text-slate-600">·</span>
                        <h4
                          className={`text-sm font-semibold text-white ${
                            task.isCompleted ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {task.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                        <span className="text-slate-300">{task.module}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-emerald-400">{task.filePath}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className={task.priority === 'P0' ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {task.priority}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span>{task.storyPoints} pts</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 self-start">
                    {task.isCompleted ? 'Completed' : 'Pending'}
                  </span>
                </div>

                {/* Details & Acceptance Criteria */}
                <div className="pl-6 space-y-2 text-xs">
                  <p className="text-slate-300 leading-relaxed">
                    {task.implementationDetails}
                  </p>

                  <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                      Acceptance Criteria:
                    </span>
                    <ul className="space-y-0.5 text-slate-300">
                      {task.acceptanceCriteria.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-mono">✓</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* OpenCodeReview Gate requirement */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400/90 pt-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>OCR Quality Gate: {task.openCodeReviewGate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PROGRESS.MD */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Ready-to-use PROGRESS.md for repository root
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(plan.progressMarkdown, 'progress-copy')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {copiedKey === 'progress-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Markdown</span>
              </button>
              <button
                onClick={() => handleDownload(plan.progressMarkdown, 'PROGRESS.md')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PROGRESS.md</span>
              </button>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-[600px] overflow-y-auto leading-relaxed">
            {plan.progressMarkdown}
          </div>
        </div>
      )}

      {/* TAB 4: AGENT CODING PLAN */}
      {activeTab === 'agentPlan' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-400 font-mono block">
                Autonomous AI Agent Execution Plan (AGENT_CODING_PLAN.md)
              </span>
              <p className="text-xs text-slate-400">
                Feed this system prompt directly into Cursor Composer, Claude Code, Roo Code, Aider, or Devin to code the complete application autonomously.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => handleCopy(plan.agentCodingPlanMarkdown, 'agent-copy')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {copiedKey === 'agent-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Agent Plan</span>
              </button>
              <button
                onClick={() => handleDownload(plan.agentCodingPlanMarkdown, 'AGENT_CODING_PLAN.md')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download AGENT_CODING_PLAN.md</span>
              </button>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-[600px] overflow-y-auto leading-relaxed">
            {plan.agentCodingPlanMarkdown}
          </div>
        </div>
      )}

      {/* TAB 5: OPENCODEREVIEW CI/CD CONFIG */}
      {activeTab === 'ocrConfig' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Alibaba OpenCodeReview Configuration & GitHub Actions Pipeline
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              These configuration files ensure continuous PR review, AST architectural checks, and security guardrails using
              <code className="text-emerald-400 ml-1">npm i @alibaba-group/open-code-review</code> inside the new application.
            </p>
          </div>

          {/* Config file .opencodereviewrc.json */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300">
                1. Configuration File: <span className="text-emerald-400">.opencodereviewrc.json</span>
              </span>
              <button
                onClick={() => handleCopy(plan.openCodeReviewConfig, 'ocr-cfg')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-slate-800 text-slate-300 hover:text-white"
              >
                {copiedKey === 'ocr-cfg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
              {plan.openCodeReviewConfig}
            </pre>
          </div>

          {/* Workflow file .github/workflows/open-code-review.yml */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300">
                2. GitHub Actions PR Review: <span className="text-emerald-400">.github/workflows/open-code-review.yml</span>
              </span>
              <button
                onClick={() => handleCopy(plan.githubWorkflowYaml, 'workflow-yml')}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-slate-800 text-slate-300 hover:text-white"
              >
                {copiedKey === 'workflow-yml' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
              {plan.githubWorkflowYaml}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 6: FOLDER STRUCTURE & LANGUAGE SCAFFOLDER */}
      {activeTab === 'structure' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Target Language Repository Structure: {plan.appConfig?.appName || idea.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Idiomatic directory layout and file hierarchy generated specifically for {plan.appConfig?.primaryLanguage?.toUpperCase() || 'this application'}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(plan.folderStructure || '', 'folder-tree-copy')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {copiedKey === 'folder-tree-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Tree</span>
              </button>
              <button
                onClick={() => handleDownload(plan.folderStructure || '', `${plan.appConfig?.appName || 'project'}-structure.txt`, 'text/plain')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Layout</span>
              </button>
            </div>
          </div>

          {/* Language Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Primary Language</span>
              <span className="text-emerald-400 font-bold uppercase">
                {plan.appConfig?.primaryLanguage || 'TypeScript'}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Package Manager</span>
              <span className="text-slate-200 font-bold">
                {plan.appConfig?.packageManager || 'npm'}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Architecture Style</span>
              <span className="text-slate-200 font-bold truncate block" title={plan.appConfig?.targetArchitecture}>
                {plan.appConfig?.targetArchitecture || 'Modular Fullstack'}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Quality Gate</span>
              <span className="text-emerald-400 font-bold truncate block">
                OpenCodeReview Armed
              </span>
            </div>
          </div>

          {/* ASCII Directory Tree */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Directory & File Hierarchy:</span>
              <span className="text-emerald-400">Enforces @alibaba-group/open-code-review</span>
            </div>
            <pre className="p-5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[500px]">
              {plan.folderStructure || `Error loading tree diagram`}
            </pre>
          </div>

          {/* Autonomous Bash Scaffolder Snippet */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant Terminal Scaffolding Command:</span>
              </span>
              <button
                onClick={() => {
                  const safe = (plan.appConfig?.appName || 'my-app').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
                  const lang = plan.appConfig?.primaryLanguage || 'typescript';
                  let cmd = '';
                  if (lang === 'python') {
                    cmd = `mkdir -p ${safe}/app/{core,api/v1,models,schemas,services} ${safe}/tests && touch ${safe}/{pyproject.toml,.opencodereviewrc.json,PROGRESS.md,AGENT_CODING_PLAN.md} ${safe}/app/main.py`;
                  } else if (lang === 'go') {
                    cmd = `mkdir -p ${safe}/cmd/server ${safe}/internal/{config,handler,service,repository,middleware} ${safe}/pkg/models && touch ${safe}/{go.mod,.opencodereviewrc.json,PROGRESS.md,AGENT_CODING_PLAN.md} ${safe}/cmd/server/main.go`;
                  } else if (lang === 'rust') {
                    cmd = `mkdir -p ${safe}/src/{routes,models,services} ${safe}/tests && touch ${safe}/{Cargo.toml,.opencodereviewrc.json,PROGRESS.md,AGENT_CODING_PLAN.md} ${safe}/src/main.rs`;
                  } else {
                    cmd = `mkdir -p ${safe}/src/{components,services,types} ${safe}/.github/workflows && touch ${safe}/{package.json,tsconfig.json,server.ts,.opencodereviewrc.json,PROGRESS.md,AGENT_CODING_PLAN.md}`;
                  }
                  handleCopy(cmd, 'bash-scaffold');
                }}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-mono"
              >
                {copiedKey === 'bash-scaffold' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'bash-scaffold' ? 'Copied Command' : 'Copy Scaffolding Shell Command'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Run this one-liner in bash to immediately materialize the complete folder skeleton on your local environment or Docker container.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
