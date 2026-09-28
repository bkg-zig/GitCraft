import React, { useState, useMemo } from 'react';
import { GitHubRepo, ExtractedFeature } from '../types';
import {
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  Filter,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Database,
  Layout,
  Terminal,
  Puzzle,
  Download,
} from 'lucide-react';

interface MasterFeatureMatrixProps {
  repos: GitHubRepo[];
  features: ExtractedFeature[];
  onToggleFeature: (featureId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectKillerOnly: () => void;
  onProceedToSynthesis: () => void;
  onBackToRepos: () => void;
}

export const MasterFeatureMatrix: React.FC<MasterFeatureMatrixProps> = ({
  repos,
  features,
  onToggleFeature,
  onSelectAll,
  onDeselectAll,
  onSelectKillerOnly,
  onProceedToSynthesis,
  onBackToRepos,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepoFilter, setSelectedRepoFilter] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'Core', label: 'Core Architecture', icon: Cpu },
    { id: 'UI/UX', label: 'UI & Interaction', icon: Layout },
    { id: 'Data Layer', label: 'Data & State', icon: Database },
    { id: 'Extensibility', label: 'Extensibility & Plugins', icon: Puzzle },
    { id: 'Security & Review', label: 'OpenCodeReview & Security', icon: ShieldAlert },
    { id: 'DevOps & Tooling', label: 'DevOps & CLI', icon: Terminal },
  ];

  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      const matchCat = activeCategory === 'all' || f.category === activeCategory;
      const matchRepo = selectedRepoFilter === 'all' || f.repoName === selectedRepoFilter;
      const matchQuery =
        !searchQuery ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.repoName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchRepo && matchQuery;
    });
  }, [features, activeCategory, selectedRepoFilter, searchQuery]);

  const selectedCount = features.filter((f) => f.selectedForSynthesis).length;
  const killerCount = features.filter((f) => f.importance === 'killer').length;

  const exportMatrixAsJson = () => {
    const dataStr = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalRepos: repos.length,
        repos: repos.map((r) => ({ name: r.fullName, language: r.language })),
        features: features.map((f) => ({
          name: f.name,
          category: f.category,
          vendorRepo: f.repoName,
          description: f.description,
          importance: f.importance,
          selected: f.selectedForSynthesis,
        })),
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor-features-matrix.json';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Master Vendor Feature Matrix
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
            Consolidated architectural and capability catalog extracted from all {repos.length} vendor git repositories.
            Toggle features to combine into your new synthesized application.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToRepos}
            className="px-3 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            ← Add More Repos
          </button>
          <button
            onClick={onProceedToSynthesis}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Synthesize 3 App Ideas ({selectedCount} selected)</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filters & Selection Shortcuts */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features, keywords, or repos..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Selection Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-mono text-[11px] uppercase mr-1">Select:</span>
            <button
              onClick={onSelectAll}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors font-medium"
            >
              All ({features.length})
            </button>
            <button
              onClick={onSelectKillerOnly}
              className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors font-medium"
            >
              Killer Only ({killerCount})
            </button>
            <button
              onClick={onDeselectAll}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              Deselect All
            </button>

            <button
              onClick={exportMatrixAsJson}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-auto"
              title="Download JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Category Segmented Tabs (Compliant with frontend-design rule A) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.icon && <cat.icon className="w-3.5 h-3.5" />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Vendor Repo filter */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
          <span className="text-slate-500 font-mono text-[11px] uppercase">Vendor Repo:</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedRepoFilter('all')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                selectedRepoFilter === 'all'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Repos ({repos.length})
            </button>
            {repos.map((r) => (
              <button
                key={r.fullName}
                onClick={() => setSelectedRepoFilter(r.fullName)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  selectedRepoFilter === r.fullName
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.fullName}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Grid List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
          <span>Showing {filteredFeatures.length} of {features.length} features</span>
          <span>{selectedCount} selected for app synthesis</span>
        </div>

        {filteredFeatures.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            No features match your current filter or search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredFeatures.map((feature) => (
              <div
                key={feature.id}
                onClick={() => onToggleFeature(feature.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none space-y-2.5 ${
                  feature.selectedForSynthesis
                    ? 'bg-slate-900/90 border-emerald-500/40 shadow-sm shadow-emerald-950/20'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFeature(feature.id);
                      }}
                    >
                      {feature.selectedForSynthesis ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <div>
                      <h4 className="text-sm font-semibold text-white tracking-tight">
                        {feature.name}
                      </h4>
                      {/* Unboxed Metadata Discipline */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span className="text-emerald-400">{feature.repoName}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span>{feature.category}</span>
                        {feature.importance === 'killer' && (
                          <>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="text-amber-400 font-bold">Killer Feature</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-6">
                  {feature.description}
                </p>

                {feature.technicalStack && (
                  <div className="pl-6 text-[11px] font-mono text-slate-500">
                    Stack: {feature.technicalStack}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating or Bottom Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-emerald-400">{selectedCount}</span> features will be combined into 3 unique application ideas.
        </div>
        <button
          onClick={onProceedToSynthesis}
          disabled={selectedCount === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>Synthesize 3 App Ideas</span>
        </button>
      </div>
    </div>
  );
};
