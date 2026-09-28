import React, { useState } from 'react';
import {
  ShieldCheck,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Code,
  Terminal,
  FileCode,
  Sparkles,
  Info,
  Bug,
} from 'lucide-react';
import { analyzeWithOpenCodeReview } from '../services/api';
import { OpenCodeReviewAnalysis } from '../types';

interface OpenCodeReviewInspectorProps {
  version: string;
}

const SAMPLE_CODE = `// Sample Synthesized Service from Ingested Repos
import { createClient } from '@supabase/supabase-js';

export interface ReviewEvent {
  id: string;
  repo: string;
  branch: string;
  author: string;
  astDiff: string;
}

export class ReviewPipelineEngine {
  private client: any;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || ''
    );
  }

  async processReview(event: ReviewEvent): Promise<boolean> {
    if (!event.repo || !event.astDiff) {
      throw new Error("Invalid review event payload");
    }

    // Direct database write without parameter validation
    const { error } = await this.client
      .from('reviews')
      .insert({
        repo_name: event.repo,
        diff_payload: event.astDiff,
        status: 'PENDING'
      });

    if (error) {
      console.error("DB error:", error);
      return false;
    }

    return true;
  }
}`;

export const OpenCodeReviewInspector: React.FC<OpenCodeReviewInspectorProps> = ({ version }) => {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [fileName, setFileName] = useState('src/services/reviewPipeline.ts');
  const [language, setLanguage] = useState('typescript');
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<OpenCodeReviewAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!code.trim()) return;
    setError(null);
    setIsScanning(true);
    try {
      const result = await analyzeWithOpenCodeReview(code, fileName, language);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold tracking-tight text-white">
                Alibaba OpenCodeReview Engine Studio
              </h2>
            </div>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Active package: <code className="text-emerald-400">@alibaba-group/open-code-review v{version}</code>.
              Validate and review synthesized code against enterprise AST rules, static analysis checks, and security guardrails.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>CLI Binary: ocr (Active)</span>
          </div>
        </div>

        {/* CLI Usage snippet */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">CLI Command:</span>
            <code className="text-emerald-300">npx @alibaba-group/open-code-review review --target=src/</code>
          </div>
          <span className="text-slate-500 text-[11px]">Supports AST & PR Gating</span>
        </div>
      </div>

      {/* Code Editor & Scan Action */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Box */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs w-56 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <span className="text-slate-500 font-mono text-[11px]">Paste or Edit Code</span>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={18}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-none"
            placeholder="// Paste code to review against OpenCodeReview rules..."
          />

          <button
            onClick={handleScan}
            disabled={isScanning || !code.trim()}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running OpenCodeReview AST Analysis...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Run OpenCodeReview Audit</span>
              </>
            )}
          </button>

          {error && (
            <p className="text-xs text-rose-400 font-mono">
              Scan Error: {error}
            </p>
          )}
        </div>

        {/* Scan Results Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Audit Findings & AST Report</span>
            {analysis && (
              <span className="text-emerald-400">
                Score: {analysis.reviewScore}/100
              </span>
            )}
          </div>

          {!analysis && !isScanning && (
            <div className="h-[460px] rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 flex flex-col items-center justify-center text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-300">No Review Run Yet</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Click "Run OpenCodeReview Audit" to inspect code quality, security vulnerabilities, and AST conformance.
              </p>
            </div>
          )}

          {isScanning && (
            <div className="h-[460px] rounded-xl border border-slate-800 bg-slate-950/40 p-8 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs font-mono text-slate-300">
                Analyzing syntax tree, security rules, and code standards...
              </p>
            </div>
          )}

          {analysis && !isScanning && (
            <div className="h-[460px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
              {/* Verdict Header */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Review Verdict
                  </span>
                  <span
                    className={`text-sm font-bold font-mono ${
                      analysis.verdict === 'APPROVED'
                        ? 'text-emerald-400'
                        : analysis.verdict === 'APPROVED_WITH_COMMENTS'
                        ? 'text-amber-300'
                        : 'text-rose-400'
                    }`}
                  >
                    {analysis.verdict}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    OCR Score
                  </span>
                  <span className="text-base font-bold text-white font-mono">
                    {analysis.reviewScore} / 100
                  </span>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {analysis.summary}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Complexity</span>
                  <span className="text-slate-200">{analysis.ocrMetrics.cyclomaticComplexity}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Maintainability</span>
                  <span className="text-slate-200">{analysis.ocrMetrics.maintainabilityIndex}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Security Grade</span>
                  <span className="text-emerald-400">{analysis.ocrMetrics.securityGrade}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Testability</span>
                  <span className="text-slate-200">{analysis.ocrMetrics.testabilityScore}</span>
                </div>
              </div>

              {/* Findings List */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase text-slate-400 block font-semibold">
                  Rule Findings ({analysis.findings.length})
                </span>
                {analysis.findings.map((f, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                        {f.severity === 'critical' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        ) : f.severity === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Info className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        <span>{f.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {f.ruleId} {f.lineNumber ? `· L${f.lineNumber}` : ''}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed pl-5">
                      {f.description}
                    </p>

                    {f.suggestedFix && (
                      <div className="pl-5 text-[11px] font-mono text-emerald-300 bg-slate-950 p-2 rounded mt-1 border border-slate-800/60">
                        Fix: {f.suggestedFix}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
