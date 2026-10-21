import React, { useState } from 'react';
import { api } from '../services/api.ts';
import {
  Sparkles,
  X,
  Send,
  Brain,
  Copy,
  Check,
  FileSignature,
  Building2,
  FileCheck,
  Compass,
} from 'lucide-react';

interface AIAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertClauseToTemplate?: (clauseEn: string, clauseAr: string) => void;
}

export const AIAdvisorModal: React.FC<AIAdvisorModalProps> = ({
  isOpen,
  onClose,
  onInsertClauseToTemplate,
}) => {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const sampleQueries = [
    {
      title: 'Draft UAE Partner Visa Renewal Clause',
      prompt:
        'Draft a bilingual (English & Arabic) contractual clause for a 2-year UAE Mainland Partner/Investor Visa renewal, covering document submission obligations, ICP medical typing, and liability disclaimer for government rejections.',
    },
    {
      title: 'Ajman DED Trade License Modification',
      prompt:
        'Explain the required administrative steps, initial approval requirements, and draft a contract clause for adding a new commercial activity under an existing Ajman Department of Economic Development sole establishment license.',
    },
    {
      title: 'MOHRE Employment Contract Cancellation',
      prompt:
        'Provide a bilingual contractual clause regarding employee labor cancellation, payment of gratuity/dues, and issuance of work permit cancellation clearance under current UAE Federal Labor Law.',
    },
    {
      title: 'Sub-Agent Commission Non-Circumvention',
      prompt:
        'Draft a strict non-circumvention and confidentiality clause between CORE LINK Administrative Services and an authorized sub-agent regarding direct customer solicitation and commission disbursements.',
    },
  ];

  const handleConsult = async (queryText?: string) => {
    const q = queryText || prompt;
    if (!q.trim()) return;

    setLoading(true);
    setError('');
    setResult('');

    try {
      const res = await api.consultAI(q, context);
      setResult(res);
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to complete AI reasoning. Please ensure GEMINI_API_KEY is configured in AI Studio Secrets.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0A1A3C] via-indigo-950 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300">
              <Brain className="w-6 h-6 text-blue-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  UAE Regulatory &amp; Agreement Clause Drafter
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  gemini-3.1-pro-preview &bull; High Thinking
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Deep legal reasoning for MOHRE labor rules, ICP visa procedures, and Ajman DED business licensing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Query Templates */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Select or Customize Legal &amp; Regulatory Tasks:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sampleQueries.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(item.prompt);
                    handleConsult(item.prompt);
                  }}
                  className="p-2.5 text-left rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition cursor-pointer text-xs group"
                >
                  <div className="font-bold text-amber-200 group-hover:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C9A05C]" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input Box */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Custom Query / Clause Requirements
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Ask about UAE visa rules, type approval requirements, or request a custom bilingual agreement clause..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
              />
              <button
                type="button"
                onClick={() => handleConsult()}
                disabled={loading || !prompt.trim()}
                className="absolute right-3 bottom-3 px-3 py-1.5 bg-[#C9A05C] hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Brain className="w-3.5 h-3.5 animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Reasoning Results Area */}
          {result && (
            <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Regulatory Guidance &amp; Clause Draft
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-y-auto pr-1">
                {result}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
