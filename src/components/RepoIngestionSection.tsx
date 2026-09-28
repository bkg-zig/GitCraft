import React, { useState } from 'react';
import { GitHubRepo } from '../types';
import { PRESET_STACKS } from '../data/presetStacks';
import {
  Plus,
  Github,
  Star,
  GitFork,
  Trash2,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Shield,
  Code2,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface RepoIngestionSectionProps {
  repos: GitHubRepo[];
  onAddRepo: (repoInput: string) => Promise<void>;
  onRemoveRepo: (repoId: string) => void;
  onExtractFeatures: (repo: GitHubRepo) => Promise<void>;
  onProceedToMatrix: () => void;
  isLoading: boolean;
  onLoadPreset: (presetId: string) => void;
}

export const RepoIngestionSection: React.FC<RepoIngestionSectionProps> = ({
  repos,
  onAddRepo,
  onRemoveRepo,
  onExtractFeatures,
  onProceedToMatrix,
  isLoading,
  onLoadPreset,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onAddRepo(inputVal.trim());
      setInputVal('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch GitHub repository');
    } finally {
      setSubmitting(false);
    }
  };

  const totalExtractedFeatures = repos.reduce((acc, r) => acc + (r.features?.length || 0), 0);
  const allExtracted = repos.length > 0 && repos.every((r) => r.isExtracted);

  return (
    <div className="space-y-8">
      {/* Intro Hero Banner */}
      <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Github className="w-5 h-5 text-emerald-400" />
              Add Vendor Git Repositories
            </h2>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Ingest multiple open-source and vendor GitHub repositories. GitCraft automatically parses architecture,
              capabilities, data models, and enforces Alibaba OpenCodeReview standards to synthesize a brand new application.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Status</div>
              <div className="text-sm font-medium text-emerald-400">
                {repos.length} {repos.length === 1 ? 'Repo Added' : 'Repos Added'}
              </div>
            </div>
            {totalExtractedFeatures > 0 && (
              <button
                onClick={onProceedToMatrix}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
              >
                <span>Feature Matrix</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Stacks Quick Loader */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
            Or Load Curated Vendor Stacks
          </span>
          <span className="text-xs text-slate-500">Includes @alibaba-group/open-code-review</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_STACKS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onLoadPreset(preset.id)}
              className="text-left p-4 rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                  {preset.name}
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80">{preset.badge}</span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 mb-2">{preset.description}</p>
              <div className="flex flex-wrap gap-1 text-[11px] font-mono text-slate-500">
                {preset.repos.map((r, i) => (
                  <span key={r.fullName || i} className="hover:text-slate-300">
                    {r.fullName}
                    {i < preset.repos.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Repo Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Github className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. facebook/react, supabase/supabase, alibaba/open-code-review or GitHub URL"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !inputVal.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching Repo...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Repository</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 font-mono mt-1 px-1">
            Error: {errorMsg}
          </p>
        )}
      </form>

      {/* Added Repositories List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Active Vendor Repositories ({repos.length})
          </h3>
          {repos.length > 1 && !allExtracted && (
            <button
              onClick={async () => {
                for (const r of repos) {
                  if (!r.isExtracted && !r.isExtracting) {
                    await onExtractFeatures(r);
                  }
                }
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Extract All Features
            </button>
          )}
        </div>

        {repos.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-slate-400">
            <Cpu className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No repositories added yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Add at least 2 or more GitHub repositories (or pick a preset stack above) to extract features and synthesize a new application.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4"
              >
                {/* Repo Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-semibold text-white hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                      >
                        {repo.fullName}
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                      {repo.description}
                    </p>

                    {/* Unboxed Metadata Discipline */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 font-mono">
                      <span className="flex items-center gap-1 text-amber-300/90">
                        <Star className="w-3.5 h-3.5" />
                        {repo.stars.toLocaleString()}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <GitFork className="w-3.5 h-3.5" />
                        {repo.forks.toLocaleString()}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-emerald-400">{repo.language}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-400">{repo.license}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start">
                    {!repo.isExtracted && (
                      <button
                        onClick={() => onExtractFeatures(repo)}
                        disabled={repo.isExtracting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                      >
                        {repo.isExtracting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Extracting...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Extract Features</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => onRemoveRepo(repo.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Remove repository"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Topics (Unboxed text) */}
                {repo.topics && repo.topics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="text-slate-500 font-mono text-[10px]">TAGS:</span>
                    {repo.topics.slice(0, 7).map((topic, i) => (
                      <span key={topic}>
                        #{topic}
                        {i < Math.min(repo.topics.length, 7) - 1 ? ' ·' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Extracted Features Preview Box */}
                {repo.isExtracted && repo.features && (
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-400 font-mono">
                          {repo.architectureType || 'Architectural System'}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400">
                          {repo.features.length} features harvested
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] font-mono text-slate-400">
                          {repo.openCodeReviewRules?.length || 0} OpenCodeReview Rules Armed
                        </span>
                      </div>
                    </div>

                    {repo.summary && (
                      <p className="text-xs text-slate-300 italic">
                        "{repo.summary}"
                      </p>
                    )}

                    {repo.standoutInnovation && (
                      <div className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="font-semibold text-amber-400 whitespace-nowrap">Killer Capability:</span>
                        <span>{repo.standoutInnovation}</span>
                      </div>
                    )}

                    {/* Features list snapshot */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                      {repo.features.slice(0, 6).map((feature) => (
                        <div
                          key={feature.id}
                          className="p-2.5 rounded bg-slate-900/90 border border-slate-800/60 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-200 line-clamp-1">
                              {feature.name}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400/90">
                              {feature.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {feature.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA when repos exist */}
      {repos.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{repos.length}</span> repositories added ·{' '}
            <span className="font-semibold text-emerald-400">{totalExtractedFeatures}</span> features extracted across all vendors
          </div>

          <button
            onClick={onProceedToMatrix}
            disabled={totalExtractedFeatures === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
          >
            <span>Proceed to Master Feature Matrix</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
