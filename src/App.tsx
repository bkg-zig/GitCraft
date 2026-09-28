import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RepoIngestionSection } from './components/RepoIngestionSection';
import { MasterFeatureMatrix } from './components/MasterFeatureMatrix';
import { AppSynthesisSection } from './components/AppSynthesisSection';
import { FullPlanSection } from './components/FullPlanSection';
import { OpenCodeReviewInspector } from './components/OpenCodeReviewInspector';
import { SettingsSection } from './components/SettingsSection';
import {
  GitHubRepo,
  ExtractedFeature,
  AppIdea,
  GeneratedPlan,
  CodingTask,
  ApiSettings,
  AppConfig,
} from './types';
import { PRESET_STACKS } from './data/presetStacks';
import {
  fetchGitHubRepo,
  extractRepoFeatures,
  synthesizeAppIdeas,
  generateFullPlan,
  fetchServerHealth,
  getStoredApiSettings,
  storeApiSettings,
} from './services/api';
import { CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [features, setFeatures] = useState<ExtractedFeature[]>([]);
  const [ideas, setIdeas] = useState<AppIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<AppIdea | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [apiSettings, setApiSettings] = useState<ApiSettings>(getStoredApiSettings());

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [ocrVersion, setOcrVersion] = useState<string>('1.12.10');

  // Check health and load initial stack on mount
  useEffect(() => {
    fetchServerHealth()
      .then((data) => {
        if (data.openCodeReview?.version) {
          setOcrVersion(data.openCodeReview.version);
        }
      })
      .catch((err) => console.warn('Health check error:', err));

    // Load initial curated preset stack so user sees immediate live data
    const defaultPreset = PRESET_STACKS[0];
    if (defaultPreset && defaultPreset.repos) {
      loadPreset(defaultPreset.id);
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Add a GitHub repository by URL or owner/repo
  const handleAddRepo = async (repoInput: string) => {
    const fetched = await fetchGitHubRepo(repoInput);

    // Check if already added
    if (repos.some((r) => r.fullName.toLowerCase() === fetched.fullName.toLowerCase())) {
      showToast(`Repository ${fetched.fullName} is already in your stack.`, 'info');
      return;
    }

    const newRepo: GitHubRepo = {
      ...fetched,
      isExtracting: true,
      isExtracted: false,
    };

    setRepos((prev) => [newRepo, ...prev]);
    showToast(`Added ${fetched.fullName}. Extracting features with @alibaba-group/open-code-review...`, 'info');

    // Trigger feature extraction immediately
    try {
      const extractedData = await extractRepoFeatures(newRepo);

      const parsedFeatures: ExtractedFeature[] = extractedData.features.map((f) => ({
        id: `${newRepo.id}-${f.id || Math.random().toString(36).substring(7)}`,
        repoId: newRepo.id,
        repoName: newRepo.fullName,
        name: f.name,
        description: f.description,
        category: f.category,
        importance: f.importance,
        technicalStack: f.technicalStack,
        selectedForSynthesis: true,
      }));

      // Update repo
      setRepos((prev) =>
        prev.map((r) =>
          r.id === newRepo.id
            ? {
                ...r,
                isExtracting: false,
                isExtracted: true,
                summary: extractedData.summary,
                architectureType: extractedData.architectureType,
                standoutInnovation: extractedData.standoutInnovation,
                features: parsedFeatures,
                openCodeReviewRules: extractedData.openCodeReviewRules,
              }
            : r
        )
      );

      // Append to master features list
      setFeatures((prev) => [...prev, ...parsedFeatures]);
      showToast(`Extracted ${parsedFeatures.length} features from ${newRepo.fullName}!`, 'success');
    } catch (err: any) {
      console.error('Feature extraction failed:', err);
      setRepos((prev) =>
        prev.map((r) => (r.id === newRepo.id ? { ...r, isExtracting: false } : r))
      );
      showToast(`Added ${newRepo.fullName}, but automated feature extraction failed. You can retry anytime.`, 'error');
    }
  };

  // Re-run extraction for a single repo
  const handleExtractFeatures = async (repo: GitHubRepo) => {
    setRepos((prev) =>
      prev.map((r) => (r.id === repo.id ? { ...r, isExtracting: true } : r))
    );

    try {
      const extractedData = await extractRepoFeatures(repo);
      const parsedFeatures: ExtractedFeature[] = extractedData.features.map((f) => ({
        id: `${repo.id}-${f.id || Math.random().toString(36).substring(7)}`,
        repoId: repo.id,
        repoName: repo.fullName,
        name: f.name,
        description: f.description,
        category: f.category,
        importance: f.importance,
        technicalStack: f.technicalStack,
        selectedForSynthesis: true,
      }));

      setRepos((prev) =>
        prev.map((r) =>
          r.id === repo.id
            ? {
                ...r,
                isExtracting: false,
                isExtracted: true,
                summary: extractedData.summary,
                architectureType: extractedData.architectureType,
                standoutInnovation: extractedData.standoutInnovation,
                features: parsedFeatures,
                openCodeReviewRules: extractedData.openCodeReviewRules,
              }
            : r
        )
      );

      // Replace or append features in master list
      setFeatures((prev) => [
        ...prev.filter((f) => f.repoId !== repo.id),
        ...parsedFeatures,
      ]);

      showToast(`Extracted ${parsedFeatures.length} features from ${repo.fullName}!`, 'success');
    } catch (err: any) {
      setRepos((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, isExtracting: false } : r))
      );
      showToast(`Extraction failed for ${repo.fullName}: ${err.message}`, 'error');
    }
  };

  // Remove repo
  const handleRemoveRepo = (repoId: string) => {
    setRepos((prev) => prev.filter((r) => r.id !== repoId));
    setFeatures((prev) => prev.filter((f) => f.repoId !== repoId));
    showToast('Repository removed', 'info');
  };

  // Load a curated preset stack
  const loadPreset = async (presetId: string) => {
    const preset = PRESET_STACKS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsLoading(true);
    showToast(`Loading "${preset.name}" preset stack...`, 'info');

    try {
      const newRepos: GitHubRepo[] = [];
      const newFeatures: ExtractedFeature[] = [];

      for (const presetRepo of preset.repos) {
        if (!presetRepo.fullName) continue;

        // If preset already has pre-extracted features, initialize immediately without consuming API quota!
        if (presetRepo.features && presetRepo.features.length > 0) {
          const repoId = presetRepo.id || presetRepo.fullName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
          const rData: GitHubRepo = {
            id: repoId,
            fullName: presetRepo.fullName,
            name: presetRepo.name || presetRepo.fullName.split('/')[1] || '',
            owner: presetRepo.owner || presetRepo.fullName.split('/')[0] || '',
            description: presetRepo.description || 'Open source repository',
            stars: presetRepo.stars || 1000,
            forks: presetRepo.forks || 100,
            language: presetRepo.language || 'TypeScript',
            topics: presetRepo.topics || [],
            htmlUrl: presetRepo.htmlUrl || `https://github.com/${presetRepo.fullName}`,
            license: presetRepo.license || 'Apache-2.0',
            dependencies: presetRepo.dependencies || [],
            isExtracting: false,
            isExtracted: true,
            summary: presetRepo.summary,
            architectureType: presetRepo.architectureType,
            standoutInnovation: presetRepo.standoutInnovation,
            features: presetRepo.features as ExtractedFeature[],
            openCodeReviewRules: presetRepo.openCodeReviewRules,
          };

          newRepos.push(rData);
          newFeatures.push(...(presetRepo.features as ExtractedFeature[]));
        } else {
          // Custom repo without pre-extracted features
          let rData: GitHubRepo;
          try {
            rData = await fetchGitHubRepo(presetRepo.fullName);
          } catch {
            rData = {
              id: presetRepo.fullName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
              fullName: presetRepo.fullName,
              name: presetRepo.name || presetRepo.fullName.split('/')[1] || '',
              owner: presetRepo.owner || presetRepo.fullName.split('/')[0] || '',
              description: presetRepo.description || 'Open source repository',
              stars: presetRepo.stars || 1000,
              forks: presetRepo.forks || 100,
              language: presetRepo.language || 'TypeScript',
              topics: presetRepo.topics || [],
              htmlUrl: presetRepo.htmlUrl || `https://github.com/${presetRepo.fullName}`,
              license: presetRepo.license || 'Apache-2.0',
              dependencies: presetRepo.dependencies || [],
            };
          }
          rData.isExtracting = true;
          newRepos.push(rData);
        }
      }

      setRepos([...newRepos]);
      setFeatures([...newFeatures]);

      // Only extract dynamically for repos that don't have extracted features
      const unextractedRepos = newRepos.filter((r) => !r.isExtracted);
      for (const repo of unextractedRepos) {
        try {
          const extracted = await extractRepoFeatures(repo);
          const parsed: ExtractedFeature[] = extracted.features.map((f) => ({
            id: `${repo.id}-${f.id || Math.random().toString(36).substring(7)}`,
            repoId: repo.id,
            repoName: repo.fullName,
            name: f.name,
            description: f.description,
            category: f.category,
            importance: f.importance,
            technicalStack: f.technicalStack,
            selectedForSynthesis: true,
          }));

          setRepos((prev) =>
            prev.map((r) =>
              r.id === repo.id
                ? {
                    ...r,
                    isExtracting: false,
                    isExtracted: true,
                    summary: extracted.summary,
                    architectureType: extracted.architectureType,
                    standoutInnovation: extracted.standoutInnovation,
                    features: parsed,
                    openCodeReviewRules: extracted.openCodeReviewRules,
                  }
                : r
            )
          );
          setFeatures((prev) => [...prev, ...parsed]);
        } catch (e: any) {
          console.warn('Extraction skipped for', repo.fullName, e);
          setRepos((prev) =>
            prev.map((r) => (r.id === repo.id ? { ...r, isExtracting: false } : r))
          );
        }
      }

      showToast(`Loaded ${newRepos.length} repos with ${newFeatures.length} extracted features!`, 'success');
    } catch (err: any) {
      showToast(`Failed loading preset: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle feature selection in Master Matrix
  const handleToggleFeature = (featureId: string) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId ? { ...f, selectedForSynthesis: !f.selectedForSynthesis } : f
      )
    );
  };

  const handleSelectAll = () => {
    setFeatures((prev) => prev.map((f) => ({ ...f, selectedForSynthesis: true })));
  };

  const handleDeselectAll = () => {
    setFeatures((prev) => prev.map((f) => ({ ...f, selectedForSynthesis: false })));
  };

  const handleSelectKillerOnly = () => {
    setFeatures((prev) =>
      prev.map((f) => ({ ...f, selectedForSynthesis: f.importance === 'killer' }))
    );
  };

  // Synthesize 3 novel application concepts from selected features
  const handleGenerateIdeas = async (focusTheme?: string) => {
    const selected = features.filter((f) => f.selectedForSynthesis);
    if (selected.length === 0) {
      showToast('Please select at least 1 feature in the matrix to synthesize.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await synthesizeAppIdeas(repos, selected, focusTheme, apiSettings);
      setIdeas(res.ideas);
      setCurrentStep(3);
      showToast('Synthesized 3 groundbreaking application concepts!', 'success');
    } catch (err: any) {
      showToast(`Failed to synthesize app ideas: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Select an idea and generate complete roadmap, tasks plan, PROGRESS.md, and agent plan
  const handleSelectIdea = async (idea: AppIdea, appConfig?: AppConfig) => {
    setSelectedIdea(idea);
    setIsPlanning(true);
    const chosenName = appConfig?.appName || idea.title;
    const chosenLang = (appConfig?.primaryLanguage || 'TypeScript').toUpperCase();
    showToast(`Generating complete engineering plan for "${chosenName}" in ${chosenLang}...`, 'info');

    try {
      const selected = features.filter((f) => f.selectedForSynthesis);
      const plan = await generateFullPlan(idea, repos, selected, appConfig, apiSettings);
      setGeneratedPlan(plan);
      setCurrentStep(4);
      showToast(`Roadmap, Tasks, PROGRESS.md, and ${chosenLang} Folder Structure generated successfully!`, 'success');
    } catch (err: any) {
      showToast(`Failed generating plan: ${err.message}`, 'error');
    } finally {
      setIsPlanning(false);
    }
  };

  const handleUpdateTasks = (tasks: CodingTask[]) => {
    if (generatedPlan) {
      setGeneratedPlan({
        ...generatedPlan,
        tasksPlan: tasks,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-mono flex items-center gap-2.5 backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                : notification.type === 'error'
                ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                : 'bg-slate-900/95 text-slate-200 border-slate-700'
            }`}
          >
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {notification.type === 'info' && <ShieldCheck className="w-4 h-4 text-sky-400" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        currentStep={currentStep}
        onSelectStep={setCurrentStep}
        reposCount={repos.length}
        featuresCount={features.length}
        hasIdeas={ideas.length > 0}
        hasPlan={Boolean(generatedPlan)}
        openCodeReviewVersion={ocrVersion}
        apiSettings={apiSettings}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Repo Ingestion & Feature Harvesting */}
        {currentStep === 1 && (
          <RepoIngestionSection
            repos={repos}
            onAddRepo={handleAddRepo}
            onRemoveRepo={handleRemoveRepo}
            onExtractFeatures={(repo) => {
              // Pass active apiSettings
              extractRepoFeatures(repo, apiSettings).then(() => handleExtractFeatures(repo));
            }}
            onProceedToMatrix={() => setCurrentStep(2)}
            isLoading={isLoading}
            onLoadPreset={loadPreset}
          />
        )}

        {/* Step 2: Master Feature Matrix */}
        {currentStep === 2 && (
          <MasterFeatureMatrix
            repos={repos}
            features={features}
            onToggleFeature={handleToggleFeature}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onSelectKillerOnly={handleSelectKillerOnly}
            onProceedToSynthesis={() => handleGenerateIdeas()}
            onBackToRepos={() => setCurrentStep(1)}
          />
        )}

        {/* Step 3: App Synthesis & 3 Novel Concepts */}
        {currentStep === 3 && (
          <AppSynthesisSection
            ideas={ideas}
            repos={repos}
            selectedFeatures={features.filter((f) => f.selectedForSynthesis)}
            selectedIdea={selectedIdea}
            onSelectIdea={handleSelectIdea}
            onGenerateIdeas={handleGenerateIdeas}
            isLoading={isLoading}
            isPlanning={isPlanning}
            onBackToMatrix={() => setCurrentStep(2)}
          />
        )}

        {/* Step 4: Full Roadmap, Tasks Plan, PROGRESS.md, and Agent Coding Plan */}
        {currentStep === 4 && selectedIdea && generatedPlan && (
          <FullPlanSection
            idea={selectedIdea}
            plan={generatedPlan}
            onUpdateTasks={handleUpdateTasks}
            onNavigateToReviewer={() => setCurrentStep(5)}
            onBackToIdeas={() => setCurrentStep(3)}
          />
        )}

        {/* Step 5: OpenCodeReview Studio */}
        {currentStep === 5 && (
          <OpenCodeReviewInspector version={ocrVersion} />
        )}

        {/* Step 6: Settings & AI Provider */}
        {currentStep === 6 && (
          <SettingsSection
            settings={apiSettings}
            onSaveSettings={(newSettings) => {
              setApiSettings(newSettings);
              storeApiSettings(newSettings);
              showToast('API provider configuration saved & active!', 'success');
            }}
            onClose={() => setCurrentStep(1)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">GitCraft Studio</span>
            <span>·</span>
            <span>Powered by @alibaba-group/open-code-review v{ocrVersion} & Gemini 3.8</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>AST Code Review</span>
            <span>·</span>
            <span>Automated PR Gating</span>
            <span>·</span>
            <span>Autonomous Agent Blueprints</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
