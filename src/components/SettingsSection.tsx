import React, { useState, useEffect } from 'react';
import { ApiSettings, AvailableModel } from '../types';
import {
  listCustomModels,
  testApiConnection,
  storeApiSettings,
  DEFAULT_API_SETTINGS,
} from '../services/api';
import {
  Settings,
  Cloud,
  Cpu,
  Key,
  Globe,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Server,
  Code2,
} from 'lucide-react';

interface SettingsSectionProps {
  settings: ApiSettings;
  onSaveSettings: (newSettings: ApiSettings) => void;
  onClose?: () => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings,
  onSaveSettings,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState<ApiSettings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Testing connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    message: string;
    model?: string;
  } | null>(null);

  // Fetching models state
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [curlSnippet, setCurlSnippet] = useState<string>('');
  const [modelsFilter, setModelsFilter] = useState('');
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleProviderChange = (provider: 'cloud_gemini' | 'custom_openai') => {
    const updated = { ...localSettings, provider };
    setLocalSettings(updated);
    setTestResult(null);
  };

  const handlePresetSelect = (preset: {
    name: string;
    url: string;
    model: string;
    hint: string;
  }) => {
    setLocalSettings((prev) => ({
      ...prev,
      openaiBaseUrl: preset.url,
      openaiModel: preset.model,
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testApiConnection(localSettings);
      setTestResult({
        ok: res.ok,
        latencyMs: res.latencyMs,
        message: res.message,
        model: res.model,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setTestResult(null);
    try {
      const res = await listCustomModels(localSettings);
      setAvailableModels(res.models || []);
      setCurlSnippet(res.curlCommand || '');
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: `Failed to fetch models: ${err.message}`,
      });
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSelectModel = (modelId: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      openaiModel: modelId,
    }));
  };

  const handleSave = () => {
    storeApiSettings(localSettings);
    onSaveSettings(localSettings);
  };

  const handleResetToDefaults = () => {
    setLocalSettings(DEFAULT_API_SETTINGS);
    storeApiSettings(DEFAULT_API_SETTINGS);
    onSaveSettings(DEFAULT_API_SETTINGS);
    setTestResult(null);
    setAvailableModels([]);
  };

  const copyCurl = () => {
    if (!curlSnippet) return;
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const presets = [
    {
      name: 'OpenAI Official',
      url: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      hint: 'Standard OpenAI API',
    },
    {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1',
      model: 'deepseek/deepseek-chat',
      hint: 'Aggregator with 100+ models',
    },
    {
      name: 'DeepSeek',
      url: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      hint: 'DeepSeek-V3 / Coder',
    },
    {
      name: 'Groq Cloud',
      url: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      hint: 'Ultra-fast LPU inference',
    },
    {
      name: 'Ollama (Local)',
      url: 'http://localhost:11434/v1',
      model: 'llama3.2',
      hint: 'Local machine AI (free, private)',
    },
    {
      name: 'LM Studio (Local)',
      url: 'http://localhost:1234/v1',
      model: 'local-model',
      hint: 'Local desktop server',
    },
  ];

  const filteredModels = availableModels.filter((m) =>
    m.id.toLowerCase().includes(modelsFilter.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              AI Provider & API Settings
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Real Worksteps · No Simulations
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Configure your AI engine for real, production execution. Use built-in Cloud Gemini or connect your own OpenAI-compatible endpoint (OpenAI, OpenRouter, DeepSeek, Groq, Ollama, LM Studio) to query models via cURL and run live feature extractions, synthesis, coding agent plans, and OpenCodeReview AST audits.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close Settings
          </button>
        )}
      </div>

      {/* Provider Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cloud (Gemini) Card */}
        <div
          onClick={() => handleProviderChange('cloud_gemini')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            localSettings.provider === 'cloud_gemini'
              ? 'bg-slate-900/90 border-emerald-500 ring-1 ring-emerald-500 shadow-lg shadow-emerald-950/20'
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Cloud AI (Google Gemini)</span>
                  {localSettings.provider === 'cloud_gemini' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      ACTIVE
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-speed Gemini 3.8 / 3.1 Pro models via official Google GenAI SDK.
                </p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                localSettings.provider === 'cloud_gemini'
                  ? 'border-emerald-400 bg-emerald-500'
                  : 'border-slate-600'
              }`}
            >
              {localSettings.provider === 'cloud_gemini' && (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Built-in Cloud Run Key + Optional Custom Key Fallback</span>
          </div>
        </div>

        {/* Custom (OpenAI-Compatible) Card */}
        <div
          onClick={() => handleProviderChange('custom_openai')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            localSettings.provider === 'custom_openai'
              ? 'bg-slate-900/90 border-emerald-500 ring-1 ring-emerald-500 shadow-lg shadow-emerald-950/20'
              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Custom API (OpenAI-Compatible)</span>
                  {localSettings.provider === 'custom_openai' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                      ACTIVE
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  OpenAI, OpenRouter, DeepSeek, Groq, Ollama, LM Studio, or self-hosted LLM.
                </p>
              </div>
            </div>
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                localSettings.provider === 'custom_openai'
                  ? 'border-sky-400 bg-sky-500'
                  : 'border-slate-600'
              }`}
            >
              {localSettings.provider === 'custom_openai' && (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>cURL /v1/models Discovery · Unlimited Quota · Zero Mocks</span>
          </div>
        </div>
      </div>

      {/* Configuration Form based on active provider */}
      {localSettings.provider === 'custom_openai' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              <span>Configure OpenAI-Compatible Endpoint</span>
            </h3>
            <p className="text-xs text-slate-400">
              Provide your API Base URL and key. Use the one-click presets below to auto-fill common providers.
            </p>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase text-slate-400 block font-semibold">
              Quick Provider Presets:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    localSettings.openaiBaseUrl === preset.url
                      ? 'bg-sky-950/80 border-sky-500 text-sky-200'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold block">{preset.name}</span>
                  <span className="text-[10px] text-slate-400 block truncate">{preset.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Base URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>API Base URL</span>
              </label>
              <input
                type="text"
                value={localSettings.openaiBaseUrl}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, openaiBaseUrl: e.target.value })
                }
                placeholder="https://api.openai.com/v1"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-[11px] text-slate-500">
                E.g. https://api.openai.com/v1 or http://localhost:11434/v1
              </span>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                <span>API Key</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={localSettings.openaiApiKey}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, openaiApiKey: e.target.value })
                  }
                  placeholder="sk-..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-500">
                Key stays securely in your browser & server proxy (not logged or exposed)
              </span>
            </div>
          </div>

          {/* Model selection & discovery */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  <span>Model Identifier</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Target model for feature harvesting, app synthesis, and OpenCodeReview audits.
                </p>
              </div>

              {/* cURL & Fetch Models Button */}
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={isFetchingModels || !localSettings.openaiBaseUrl}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition-colors disabled:opacity-50 self-start sm:self-auto"
              >
                {isFetchingModels ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>cURLing /v1/models...</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>cURL / Fetch Available Models</span>
                  </>
                )}
              </button>
            </div>

            <input
              type="text"
              value={localSettings.openaiModel}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, openaiModel: e.target.value })
              }
              placeholder="e.g. gpt-4o, deepseek-chat, llama-3.3-70b-versatile, qwen-2.5-coder-32b"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />

            {/* Display Models Returned by cURL */}
            {availableModels.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Found {availableModels.length} Models from Endpoint</span>
                  </span>
                  <input
                    type="text"
                    value={modelsFilter}
                    onChange={(e) => setModelsFilter(e.target.value)}
                    placeholder="Filter models..."
                    className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 font-mono w-48"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 pr-1">
                  {filteredModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelectModel(model.id)}
                      className={`px-2.5 py-1.5 text-left rounded-lg text-xs font-mono truncate transition-colors border ${
                        localSettings.openaiModel === model.id
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                          : 'bg-slate-900/60 text-slate-300 border-slate-800/80 hover:bg-slate-900 hover:text-white'
                      }`}
                      title={model.id}
                    >
                      {model.id}
                    </button>
                  ))}
                </div>

                {curlSnippet && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="truncate mr-2">Discovered via: {curlSnippet}</span>
                    <button
                      type="button"
                      onClick={copyCurl}
                      className="flex items-center gap-1 text-sky-400 hover:text-sky-300 whitespace-nowrap"
                    >
                      {copiedCurl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cloud Gemini Configuration Form */}
      {localSettings.provider === 'cloud_gemini' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Google Gemini Cloud Engine</span>
            </h3>
            <p className="text-xs text-slate-400">
              Powered by the official Google GenAI SDK. If the default Cloud Run quota is saturated, provide your personal Gemini API key below or switch to the Custom API tab.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gemini Model */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gemini Model</span>
              </label>
              <select
                value={localSettings.geminiModel || 'gemini-3.8-flash'}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, geminiModel: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended, Ultra Fast)</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Deep Reasoning)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              </select>
              <span className="text-[11px] text-slate-500">
                Official Google Gemini latest production models
              </span>
            </div>

            {/* Custom Gemini Key (Optional Fallback) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Custom Gemini API Key (Optional)</span>
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={localSettings.geminiApiKey || ''}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })
                  }
                  placeholder="Leave empty to use default injected Cloud Run key"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[11px] text-slate-500">
                Get your key at aistudio.google.com/apikey to bypass shared limits
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Test Connection Banner & Results */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 ${
            testResult.ok
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
          }`}
        >
          {testResult.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
          )}
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span>{testResult.ok ? 'Connection Verified Successfully!' : 'Connection Failed'}</span>
              {testResult.latencyMs !== undefined && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                  {testResult.latencyMs}ms latency
                </span>
              )}
              {testResult.model && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                  Model: {testResult.model}
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">{testResult.message}</p>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Test Live Connection</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Save & Apply Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
