import React, { useState } from 'react';
import { AppIdea, GitHubRepo, ExtractedFeature, AppConfig, SupportedLanguage } from '../types';
import {
  Sparkles,
  ArrowRight,
  Target,
  Zap,
  Layers,
  Code,
  CheckCircle,
  Loader2,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  FolderTree,
  FileCode,
  Terminal,
  Settings2,
  X,
  Check,
} from 'lucide-react';

interface AppSynthesisSectionProps {
  ideas: AppIdea[];
  repos: GitHubRepo[];
  selectedFeatures: ExtractedFeature[];
  selectedIdea: AppIdea | null;
  onSelectIdea: (idea: AppIdea, appConfig?: AppConfig) => Promise<void>;
  onGenerateIdeas: (focusTheme?: string) => Promise<void>;
  isLoading: boolean;
  isPlanning: boolean;
  onBackToMatrix: () => void;
}

const SUPPORTED_LANGUAGES: Array<{
  id: SupportedLanguage;
  name: string;
  tagline: string;
  defaultFramework: string;
  defaultPackageManager: string;
  iconText: string;
  colorClass: string;
  sampleEntry: string;
}> = [
  {
    id: 'typescript',
    name: 'TypeScript',
    tagline: 'Node.js, Express, React, Vite, Next.js',
    defaultFramework: 'Fullstack Express + React',
    defaultPackageManager: 'npm',
    iconText: 'TS',
    colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    sampleEntry: 'src/main.tsx · server.ts · package.json',
  },
  {
    id: 'python',
    name: 'Python',
    tagline: 'FastAPI, Pydantic, SQLAlchemy, Pytest',
    defaultFramework: 'FastAPI Microservice Engine',
    defaultPackageManager: 'poetry',
    iconText: 'PY',
    colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    sampleEntry: 'app/main.py · pyproject.toml · poetry.lock',
  },
  {
    id: 'go',
    name: 'Go',
    tagline: 'Fiber / Gin, Go Modules, Clean Architecture',
    defaultFramework: 'Go Fiber High-Performance Core',
    defaultPackageManager: 'go modules',
    iconText: 'GO',
    colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    sampleEntry: 'cmd/server/main.go · go.mod · internal/',
  },
  {
    id: 'rust',
    name: 'Rust',
    tagline: 'Actix-web / Axum, Cargo, Serde, Tokio',
    defaultFramework: 'Actix-Web Async Engine',
    defaultPackageManager: 'cargo',
    iconText: 'RS',
    colorClass: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    sampleEntry: 'src/main.rs · Cargo.toml · src/routes/',
  },
  {
    id: 'java',
    name: 'Java / Kotlin',
    tagline: 'Spring Boot 3, Micronaut, Maven, Gradle',
    defaultFramework: 'Spring Boot REST & Quality Gates',
    defaultPackageManager: 'maven',
    iconText: 'JV',
    colorClass: 'text-red-400 bg-red-500/10 border-red-500/30',
    sampleEntry: 'src/main/java/Application.java · pom.xml',
  },
  {
    id: 'csharp',
    name: 'C# / .NET',
    tagline: 'ASP.NET Core Minimal APIs, Entity Framework',
    defaultFramework: 'ASP.NET Core Web API',
    defaultPackageManager: 'dotnet cli / nuget',
    iconText: 'C#',
    colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    sampleEntry: 'Program.cs · Controllers/ · appsettings.json',
  },
  {
    id: 'php',
    name: 'PHP',
    tagline: 'Laravel 11, Composer, Pest, PHPStan',
    defaultFramework: 'Laravel Clean Architecture',
    defaultPackageManager: 'composer',
    iconText: 'PHP',
    colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    sampleEntry: 'routes/api.php · composer.json · app/Services/',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    tagline: 'Rails 7 API / Hanami, Bundler, RSpec',
    defaultFramework: 'Rails API Engine',
    defaultPackageManager: 'bundler',
    iconText: 'RB',
    colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    sampleEntry: 'config/routes.rb · Gemfile · app/controllers/',
  },
];

export const AppSynthesisSection: React.FC<AppSynthesisSectionProps> = ({
  ideas,
  repos,
  selectedFeatures,
  selectedIdea,
  onSelectIdea,
  onGenerateIdeas,
  isLoading,
  isPlanning,
  onBackToMatrix,
}) => {
  const [focusTheme, setFocusTheme] = useState('');

  // App Configuration Modal State
  const [configuringIdea, setConfiguringIdea] = useState<AppIdea | null>(null);
  const [customAppName, setCustomAppName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('typescript');
  const [selectedArchitecture, setSelectedArchitecture] = useState('Modular Full-Stack');
  const [customPackageManager, setCustomPackageManager] = useState('npm');

  const openConfigurationModal = (idea: AppIdea) => {
    setConfiguringIdea(idea);
    // Pre-populate name with clean slug
    const initialName = idea.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setCustomAppName(initialName);
    setSelectedLanguage('typescript');
    setSelectedArchitecture('Modular Full-Stack System');
    setCustomPackageManager('npm');
  };

  const handleLanguageSelect = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.id === lang);
    if (langConfig) {
      setCustomPackageManager(langConfig.defaultPackageManager);
      setSelectedArchitecture(langConfig.defaultFramework);
    }
  };

  const handleConfirmPlanGeneration = async () => {
    if (!configuringIdea) return;

    const appConfig: AppConfig = {
      appName: customAppName.trim() || configuringIdea.title,
      primaryLanguage: selectedLanguage,
      targetArchitecture: selectedArchitecture,
      packageManager: customPackageManager,
      framework: selectedArchitecture,
    };

    const targetIdea = configuringIdea;
    setConfiguringIdea(null);
    await onSelectIdea(targetIdea, appConfig);
  };

  // Preview folder layout based on active modal selection
  const getFolderPreview = (lang: SupportedLanguage, name: string) => {
    const slug = name || 'my-synthesized-app';
    switch (lang) {
      case 'python':
        return `${slug}/
├── pyproject.toml
├── .opencodereviewrc.json
├── PROGRESS.md
├── AGENT_CODING_PLAN.md
├── app/
│   ├── main.py
│   ├── core/config.py
│   ├── api/v1/router.py
│   ├── models/schema.py
│   └── services/synthesizer.py
└── tests/test_api.py`;
      case 'go':
        return `${slug}/
├── go.mod
├── go.sum
├── .opencodereviewrc.json
├── PROGRESS.md
├── AGENT_CODING_PLAN.md
├── cmd/server/main.go
├── internal/
│   ├── handler/routes.go
│   ├── service/synthesizer.go
│   └── repository/db.go
└── pkg/models/entity.go`;
      case 'rust':
        return `${slug}/
├── Cargo.toml
├── .opencodereviewrc.json
├── PROGRESS.md
├── AGENT_CODING_PLAN.md
├── src/
│   ├── main.rs
│   ├── routes/api.rs
│   ├── models/types.rs
│   └── services/synthesizer.rs
└── tests/integration_tests.rs`;
      case 'java':
        return `${slug}/
├── pom.xml
├── .opencodereviewrc.json
├── PROGRESS.md
├── AGENT_CODING_PLAN.md
└── src/main/java/com/app/
    ├── Application.java
    ├── controller/ApiController.java
    ├── service/SynthesizerService.java
    └── model/Entity.java`;
      case 'csharp':
        return `${slug}/
├── ${slug}.csproj
├── Program.cs
├── appsettings.json
├── .opencodereviewrc.json
├── PROGRESS.md
├── AGENT_CODING_PLAN.md
├── Controllers/ApiController.cs
└── Services/SynthesizerService.cs`;
      case 'php':
        return `${slug}/
├── composer.json
├── .opencodereviewrc.json
├── PROGRESS.md
├── AGENT_CODING_PLAN.md
├── routes/api.php
├── app/Http/Controllers/ApiController.php
└── app/Services/SynthesizerService.php`;
      case 'ruby':
        return `${slug}/
├── Gemfile
├── .opencodereviewrc.json
├── PROGRESS.md
├── AGENT_CODING_PLAN.md
├── config/routes.rb
├── app/controllers/api_controller.rb
└── app/services/synthesizer_service.rb`;
      case 'typescript':
      default:
        return `${slug}/
├── package.json
├── tsconfig.json
├── .opencodereviewrc.json
├── PROGRESS.md
├── AGENT_CODING_PLAN.md
├── server.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── components/
    └── services/`;
    }
  };

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Synthesize New Applications
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              Multi-Language Scaffolding
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            By combining {selectedFeatures.length} selected features across {repos.length} vendor git repositories,
            the synthesizer formulates 3 distinct application concepts. Select and customize your target language (TypeScript, Python, Go, Rust, Java, C#, PHP, Ruby) to generate the tailored folder structure, task roadmap, PROGRESS.md, and autonomous agent instructions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToMatrix}
            className="px-3 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            ← Back to Feature Matrix
          </button>
          <button
            onClick={() => onGenerateIdeas(focusTheme)}
            disabled={isLoading || selectedFeatures.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>{ideas.length > 0 ? 'Re-Synthesize 3 Ideas' : 'Generate 3 Ideas'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Optional Focus Input */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="text-xs text-slate-400 whitespace-nowrap font-mono uppercase">
          Custom Theme / Domain Focus (Optional):
        </div>
        <input
          type="text"
          value={focusTheme}
          onChange={(e) => setFocusTheme(e.target.value)}
          placeholder="e.g. Focus on DevSecOps and automated PR review, or Real-time collaborative workspace"
          className="flex-1 w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {ideas.length > 0 && (
          <button
            onClick={() => onGenerateIdeas(focusTheme)}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors whitespace-nowrap"
          >
            Apply & Re-generate
          </button>
        )}
      </div>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="p-16 text-center rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">Synthesizing 3 Novel Application Concepts</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Cross-referencing vendor capabilities from {repos.map((r) => r.fullName).join(', ')},
              integrating @alibaba-group/open-code-review rules, and generating optimal architectural synergy...
            </p>
          </div>
        </div>
      )}

      {/* 3 Ideas Cards */}
      {!isLoading && ideas.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>3 Groundbreaking Concepts Synthesized</span>
            <span>Select one concept to configure language & scaffold folder structure</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {ideas.map((idea, index) => {
              const isSelected = selectedIdea?.id === idea.id;

              return (
                <div
                  key={idea.id || index}
                  className={`rounded-2xl border p-6 flex flex-col justify-between transition-all space-y-6 ${
                    isSelected
                      ? 'bg-slate-900/90 border-emerald-500 ring-1 ring-emerald-500 shadow-xl shadow-emerald-950/20'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header & Concept Index */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        CONCEPT 0{index + 1}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Feasibility: {idea.feasibilityScore}%</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {idea.title}
                      </h3>
                      <p className="text-xs font-medium text-emerald-300 mt-1">
                        {idea.tagline}
                      </p>
                    </div>

                    {/* Problem & Audience */}
                    <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="font-semibold text-slate-400 font-mono uppercase text-[10px] block">
                          Problem Solved:
                        </span>
                        <p className="mt-0.5 leading-relaxed">{idea.problemStatement}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-800/60">
                        <span className="font-semibold text-slate-400 font-mono uppercase text-[10px] block">
                          Target Audience:
                        </span>
                        <p className="mt-0.5">{idea.targetAudience}</p>
                      </div>
                    </div>

                    {/* Killer Differentiator */}
                    <div className="text-xs p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-200">
                      <div className="flex items-center gap-1.5 text-amber-300 font-semibold mb-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Killer Differentiator</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        {idea.killerDifferentiator}
                      </p>
                    </div>

                    {/* Synthesized Features Breakdown */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        Combined Feature Formula ({idea.synthesizedFeatures.length})
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {idea.synthesizedFeatures.map((sf, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200">{sf.featureName}</span>
                              <span className="text-[10px] font-mono text-emerald-400">{sf.fromRepo}</span>
                            </div>
                            <p className="text-[11px] text-slate-400">{sf.roleInNewApp}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommended Architecture Stack */}
                    <div className="space-y-1.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Recommended Stack
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Frontend</span>
                          <span className="text-slate-200">{idea.recommendedStack.frontend}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Backend</span>
                          <span className="text-slate-200">{idea.recommendedStack.backend}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Database</span>
                          <span className="text-slate-200">{idea.recommendedStack.database}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Review Engine</span>
                          <span className="text-emerald-400">@alibaba-group/open-code-review</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Select & Plan CTA Button */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => openConfigurationModal(idea)}
                      disabled={isPlanning}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white'
                      }`}
                    >
                      {isPlanning && isSelected ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Complete Plan...</span>
                        </>
                      ) : isSelected ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Configure & Regenerate for Language</span>
                        </>
                      ) : (
                        <>
                          <Settings2 className="w-4 h-4" />
                          <span>Select & Configure Language Structure</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* App Language & Name Configuration Modal */}
      {configuringIdea && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <FolderTree className="w-4 h-4" />
                  <span>LANGUAGE & ARCHITECTURE SCAFFOLDER</span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Configure: {configuringIdea.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Select the primary language and app name so the AI coding agents generate the exact idiomatic folder structure, dependencies, and execution plan.
                </p>
              </div>
              <button
                onClick={() => setConfiguringIdea(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* App Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span>Application Name & Repository Slug</span>
                <span className="font-mono text-[11px] text-slate-500">
                  Used for folder root & package config
                </span>
              </label>
              <input
                type="text"
                value={customAppName}
                onChange={(e) => setCustomAppName(e.target.value)}
                placeholder="e.g. arch-canvas-studio"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Primary Language Selection Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                Select Primary Target Language:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isLangSelected = selectedLanguage === lang.id;
                  return (
                    <div
                      key={lang.id}
                      onClick={() => handleLanguageSelect(lang.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isLangSelected
                          ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`w-7 h-7 rounded-lg border font-mono font-bold text-xs flex items-center justify-center ${lang.colorClass}`}
                        >
                          {lang.iconText}
                        </span>
                        {isLangSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white">{lang.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lang.tagline}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Language Details & Package Manager */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                  Target Framework / Style
                </span>
                <input
                  type="text"
                  value={selectedArchitecture}
                  onChange={(e) => setSelectedArchitecture(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">
                  Package Manager / Tool
                </span>
                <input
                  type="text"
                  value={customPackageManager}
                  onChange={(e) => setCustomPackageManager(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Live Folder Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Generated Idiomatic Directory Layout:</span>
                </span>
                <span className="text-emerald-400 font-semibold uppercase">
                  {selectedLanguage} Architecture
                </span>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 leading-relaxed">
                {getFolderPreview(selectedLanguage, customAppName)}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfiguringIdea(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmPlanGeneration}
                disabled={isPlanning}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isPlanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scaffolding in {selectedLanguage.toUpperCase()}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Full Plan for {selectedLanguage.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
