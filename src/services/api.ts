import {
  GitHubRepo,
  ExtractedFeature,
  AppIdea,
  GeneratedPlan,
  OpenCodeReviewAnalysis,
  AppConfig,
  ApiSettings,
  AvailableModel,
} from '../types';

export const DEFAULT_API_SETTINGS: ApiSettings = {
  provider: 'cloud_gemini',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  geminiModel: 'gemini-3.8-flash',
};

const STORAGE_KEY = 'gitcraft_api_settings_v2';

export function getStoredApiSettings(): ApiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_API_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load api settings:', e);
  }
  return DEFAULT_API_SETTINGS;
}

export function storeApiSettings(settings: ApiSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save api settings:', e);
  }
}

export async function fetchServerHealth(): Promise<{
  status: string;
  hasApiKey: boolean;
  openCodeReview: {
    package: string;
    version: string;
    description: string;
    binName: string;
    status: string;
  };
}> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function listCustomModels(settings: ApiSettings): Promise<{
  models: AvailableModel[];
  curlCommand: string;
}> {
  const res = await fetch('/api/settings/list-models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch models from API URL');
  }

  return res.json();
}

export async function testApiConnection(settings: ApiSettings): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
  provider: string;
  model: string;
}> {
  const res = await fetch('/api/settings/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Connection test failed');
  }

  return res.json();
}

export async function fetchGitHubRepo(repoInput: string): Promise<GitHubRepo> {
  const res = await fetch('/api/github/fetch-repo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoInput }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch repo ${repoInput}`);
  }

  return res.json();
}

export async function extractRepoFeatures(
  repo: GitHubRepo,
  apiSettings?: ApiSettings
): Promise<{
  summary: string;
  architectureType: string;
  standoutInnovation: string;
  features: Array<{
    id: string;
    name: string;
    description: string;
    category: 'Core' | 'UI/UX' | 'Data Layer' | 'Extensibility' | 'Security & Review' | 'DevOps & Tooling';
    importance: 'killer' | 'high' | 'standard';
    technicalStack?: string;
  }>;
  openCodeReviewRules: Array<{
    rule: string;
    rationale: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
}> {
  const effectiveSettings = apiSettings || getStoredApiSettings();
  const res = await fetch('/api/github/extract-features', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, apiSettings: effectiveSettings }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to extract features for ${repo.fullName}`);
  }

  return res.json();
}

export async function synthesizeAppIdeas(
  repos: GitHubRepo[],
  selectedFeatures: ExtractedFeature[],
  focusTheme?: string,
  apiSettings?: ApiSettings
): Promise<{ ideas: AppIdea[] }> {
  const effectiveSettings = apiSettings || getStoredApiSettings();
  const res = await fetch('/api/synthesize/app-ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repos,
      selectedFeatures,
      focusTheme,
      apiSettings: effectiveSettings,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to synthesize app ideas');
  }

  return res.json();
}

export async function generateFullPlan(
  selectedIdea: AppIdea,
  repos: GitHubRepo[],
  selectedFeatures: ExtractedFeature[],
  appConfig?: AppConfig,
  apiSettings?: ApiSettings
): Promise<GeneratedPlan> {
  const effectiveSettings = apiSettings || getStoredApiSettings();
  const res = await fetch('/api/synthesize/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectedIdea,
      repos,
      selectedFeatures,
      appConfig,
      apiSettings: effectiveSettings,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate comprehensive plan');
  }

  return res.json();
}

export async function analyzeWithOpenCodeReview(
  codeSnippet: string,
  fileName?: string,
  language?: string,
  apiSettings?: ApiSettings
): Promise<OpenCodeReviewAnalysis> {
  const effectiveSettings = apiSettings || getStoredApiSettings();
  const res = await fetch('/api/opencode-review/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      codeSnippet,
      fileName,
      language,
      apiSettings: effectiveSettings,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'OpenCodeReview analysis failed');
  }

  return res.json();
}
