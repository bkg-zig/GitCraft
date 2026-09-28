export interface GitHubRepo {
  id: string;
  fullName: string;
  name: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  htmlUrl: string;
  license: string;
  readmeSnippet?: string;
  dependencies?: string[];
  isExtracting?: boolean;
  isExtracted?: boolean;
  features?: ExtractedFeature[];
  openCodeReviewRules?: OpenCodeReviewRule[];
  summary?: string;
  architectureType?: string;
  standoutInnovation?: string;
}

export interface ExtractedFeature {
  id: string;
  repoId: string;
  repoName: string;
  name: string;
  description: string;
  category: 'Core' | 'UI/UX' | 'Data Layer' | 'Extensibility' | 'Security & Review' | 'DevOps & Tooling';
  importance: 'killer' | 'high' | 'standard';
  technicalStack?: string;
  selectedForSynthesis: boolean;
}

export interface OpenCodeReviewRule {
  rule: string;
  rationale: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface AppIdea {
  id: string;
  title: string;
  tagline: string;
  targetAudience: string;
  problemStatement: string;
  killerDifferentiator: string;
  synthesizedFeatures: {
    featureName: string;
    fromRepo: string;
    roleInNewApp: string;
  }[];
  recommendedStack: {
    frontend: string;
    backend: string;
    database: string;
    codeReviewEngine: string;
    deployment: string;
  };
  feasibilityScore: number;
  marketPotential: string;
}

export interface RoadmapPhase {
  phaseNumber: number;
  phaseName: string;
  duration: string;
  objective: string;
  keyMilestones: string[];
  deliverables: string[];
  riskMitigation: string;
}

export interface CodingTask {
  id: string;
  module: string;
  title: string;
  filePath: string;
  storyPoints: number;
  priority: 'P0' | 'P1' | 'P2';
  acceptanceCriteria: string[];
  implementationDetails: string;
  openCodeReviewGate: string;
  isCompleted?: boolean;
}

export interface AvailableModel {
  id: string;
  name?: string;
  created?: number;
  owned_by?: string;
}

export interface ApiSettings {
  provider: 'cloud_gemini' | 'custom_openai';
  // Custom OpenAI-compatible settings
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;
  // Cloud Gemini settings
  geminiApiKey?: string;
  geminiModel?: string;
}

export type SupportedLanguage =
  | 'typescript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'csharp'
  | 'php'
  | 'ruby';

export interface AppConfig {
  appName: string;
  primaryLanguage: SupportedLanguage;
  targetArchitecture: string;
  packageManager: string;
  framework?: string;
}

export interface FolderNode {
  name: string;
  type: 'file' | 'folder';
  description?: string;
  children?: FolderNode[];
}

export interface GeneratedPlan {
  roadmap: RoadmapPhase[];
  tasksPlan: CodingTask[];
  progressMarkdown: string;
  agentCodingPlanMarkdown: string;
  openCodeReviewConfig: string;
  githubWorkflowYaml: string;
  appConfig?: AppConfig;
  folderStructure?: string;
  folderTree?: FolderNode[];
}

export interface OpenCodeReviewFinding {
  lineNumber?: number;
  ruleId: string;
  severity: 'critical' | 'warning' | 'suggestion';
  title: string;
  description: string;
  suggestedFix?: string;
}

export interface OpenCodeReviewAnalysis {
  reviewScore: number;
  verdict: 'APPROVED' | 'APPROVED_WITH_COMMENTS' | 'CHANGES_REQUESTED';
  summary: string;
  findings: OpenCodeReviewFinding[];
  ocrMetrics: {
    cyclomaticComplexity: string;
    maintainabilityIndex: string;
    securityGrade: string;
    testabilityScore: string;
  };
}
