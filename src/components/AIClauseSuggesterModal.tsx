import React, { useState } from 'react';
import { api } from '../services/api.ts';
import {
  Sparkles,
  X,
  Plus,
  Check,
  Scale,
  Loader2,
  Copy,
  AlertCircle,
  FileCheck2,
  Edit3,
} from 'lucide-react';

export interface SuggestedClause {
  titleEn: string;
  titleAr: string;
  clauseEn: string;
  clauseAr: string;
}

interface AIClauseSuggesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTopic: string;
  documentType?: 'agreement' | 'invoice';
  onInsertClause: (clauseEn: string, clauseAr: string, titleEn?: string, titleAr?: string) => void;
  onInsertAllClauses: (allEn: string, allAr: string) => void;
}

export const AIClauseSuggesterModal: React.FC<AIClauseSuggesterModalProps> = ({
  isOpen,
  onClose,
  serviceTopic,
  documentType = 'agreement',
  onInsertClause,
  onInsertAllClauses,
}) => {
  const [topic, setTopic] = useState(serviceTopic || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clauses, setClauses] = useState<SuggestedClause[]>([]);
  const [insertedIndices, setInsertedIndices] = useState<number[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Sync topic when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTopic(serviceTopic || '');
      setInsertedIndices([]);
      setEditingIndex(null);
      setError(null);
      if (serviceTopic.trim()) {
        fetchSuggestions(serviceTopic.trim());
      } else {
        setClauses(getDefaultClauses(documentType));
      }
    }
  }, [isOpen, serviceTopic, documentType]);

  const getDefaultClauses = (type: 'agreement' | 'invoice'): SuggestedClause[] => {
    if (type === 'invoice') {
      return [
        {
          titleEn: 'Government & Typing Fee Clearance',
          titleAr: 'سداد الرسوم والطباعة الحكومية',
          clauseEn: 'All government application typing and filing fees are due immediately upon submission. Approved clearance is subject to official portal verification.',
          clauseAr: 'تستحق كافة رسوم الطباعة والمعاملات الحكومية فور تقديم الطلب. ويخضع استلام المعاملة المعتمدة للتحقق عبر البوابة الرسمية.',
        },
        {
          titleEn: 'Non-Refundable Administrative Charges & Processing Window',
          titleAr: 'رسوم الخدمات الإدارية غير قابلة للاسترداد وفترة المعالجة',
          clauseEn: 'Service charges are non-refundable once typing has commenced. Any approved refund takes up to 22 working days to be processed.',
          clauseAr: 'رسوم الخدمة غير قابلة للاسترداد بعد بدء إجراءات الطباعة. وفي حال اعتماد أي استرداد مالي، تستغرق المعالجة 22 يوم عمل.',
        },
        {
          titleEn: 'Regulatory Document Authenticity Notice',
          titleAr: 'صحة البيانات والوثائق المقدمة',
          clauseEn: 'The client confirms all uploaded credentials, passports, and photos are authentic and compliant with UAE ICP and GDRFA regulations.',
          clauseAr: 'يقر العميل بصحة جميع المستندات والجوازات والصور المرفقة ومطابقتها لمتطلبات الهيئة الاتحادية للهوية والجنسية والإقامة.',
        },
      ];
    }

    return [
      {
        titleEn: 'Scope of Administrative Services & Processing',
        titleAr: 'نطاق الخدمات الإدارية وإجراءات الطباعة',
        clauseEn: 'The First Party shall provide professional typing, file preparation, and transaction follow-up in compliance with UAE Federal and Ajman Local legislation.',
        clauseAr: 'يلتزم الطرف الأول بتقديم خدمات الطباعة المتخصصة وتجهيز الملفات ومتابعة المعاملات وفقاً للتشريعات الاتحادية ولوائح إمارة عجمان.',
      },
      {
        titleEn: 'Limitation of Liability Regarding Authority Decisions',
        titleAr: 'حدود المسؤولية وقرارات الجهات الحكومية',
        clauseEn: 'The First Party acts as an authorized typing and administrative liaison. Final approvals, rejections, security clearances, and processing timeframes remain at the sole discretion of the relevant UAE government authorities.',
        clauseAr: 'يعمل الطرف الأول كمركز خدمات إدارية وطباعة معتمد، وتبقى القرارات النهائية بالموافقة أو الرفض والتدقيق الأمني من الاختصاص الحصري للجهات الحكومية المعنية.',
      },
      {
        titleEn: 'Fee Schedule, Government Dues & Non-Refundability',
        titleAr: 'جدول الأتعاب والرسوم الحكومية وسياسة الاسترداد',
        clauseEn: 'All agreed service fees and official governmental typing charges are non-refundable once processing has started. Any approved refund processing requires 22 working days.',
        clauseAr: 'تعتبر رسوم الخدمة المتفق عليها ورسوم الطباعة الحكومية غير قابلة للاسترداد بعد الشروع في المعاملة. وتستغرق معالجة أي استرداد معتمد 22 يوم عمل.',
      },
    ];
  };

  const fetchSuggestions = async (searchTopic: string) => {
    if (!searchTopic.trim()) return;
    setLoading(true);
    setError(null);
    setInsertedIndices([]);

    const promptText = `You are a UAE Legal & Typing Center Compliance Specialist for CORE LINK Administrative Services (Ajman License #140290).
The user is preparing an official ${documentType === 'invoice' ? 'invoice' : 'administrative contract/agreement'} for this specific service / topic:
"${searchTopic}"

Generate 2 to 4 standard, legally robust clauses strictly compliant with UAE Federal and Ajman laws (ICP immigration, GDRFA, MOHRE labor, Ajman DED typing norms).
Cover appropriate areas such as:
1. Specific Scope & Client Documentation Responsibilities
2. Payment, Government Clearances & Non-Refundable Administrative Charges
3. Limitation of Liability for Sovereign/Authority Decisions (ICP/MOHRE/DED)
4. Refund Processing Window (22 working days) & Jurisdiction of Ajman Courts

You MUST return ONLY a valid JSON array of objects with no conversational text or markdown code fences outside the JSON:
[
  {
    "titleEn": "...",
    "titleAr": "...",
    "clauseEn": "...",
    "clauseAr": "..."
  }
]`;

    try {
      const responseText = await api.consultAI(
        promptText,
        `Topic: ${searchTopic} | Document Type: ${documentType}`
      );

      let clean = responseText.trim();
      if (clean.includes('```json')) {
        clean = clean.split('```json')[1].split('```')[0].trim();
      } else if (clean.includes('```')) {
        clean = clean.split('```')[1].split('```')[0].trim();
      }

      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setClauses(parsed);
      } else {
        setClauses(getDefaultClauses(documentType));
      }
    } catch (err: any) {
      console.warn('AI suggestions error, using standard fallback clauses:', err);
      setError('AI suggestion service currently busy. Loaded standard UAE-compliant clauses for this service.');
      setClauses(getDefaultClauses(documentType));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleInsertSingle = (index: number) => {
    const c = clauses[index];
    if (!c) return;
    onInsertClause(c.clauseEn, c.clauseAr, c.titleEn, c.titleAr);
    setInsertedIndices(prev => (prev.includes(index) ? prev : [...prev, index]));
  };

  const handleInsertAll = () => {
    if (clauses.length === 0) return;
    const allEn = clauses
      .map((c, i) => `${i + 1}. ${c.titleEn.toUpperCase()}:\n${c.clauseEn}`)
      .join('\n\n');
    const allAr = clauses
      .map((c, i) => `${i + 1}. ${c.titleAr}:\n${c.clauseAr}`)
      .join('\n\n');

    onInsertAllClauses(allEn, allAr);
    setInsertedIndices(clauses.map((_, i) => i));
    onClose();
  };

  const handleCopyClause = (clause: SuggestedClause, idx: number) => {
    navigator.clipboard.writeText(`${clause.titleEn} / ${clause.titleAr}\n\n${clause.clauseEn}\n\n${clause.clauseAr}`);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-[#C9A05C]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Suggest UAE-Compliant Terms
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase font-mono font-bold">
                  Bilingual EN/AR
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                AI regulatory reasoning based on UAE Federal &amp; Ajman typing center regulations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search / Topic refinement input */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800">
          <form
            onSubmit={e => {
              e.preventDefault();
              fetchSuggestions(topic);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Scale className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Describe service (e.g. 2-year partner visa, commercial trade license renewal, medical follow-up)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="px-4 py-2 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Clauses</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Suggestions Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#C9A05C] flex items-center justify-center mx-auto animate-pulse">
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>
              <div className="text-sm font-bold text-white">Drafting UAE Regulatory Clauses...</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Consulting ICP immigration, GDRFA, MOHRE, and Ajman DED business compliance standards for "{topic}"
              </p>
            </div>
          ) : clauses.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No clauses generated yet. Enter a service topic above and click "Generate Clauses".
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Suggested Clauses ({clauses.length} ready):</span>
                <span className="text-[11px] text-amber-300 font-medium">
                  Review and click to insert directly into your document
                </span>
              </div>

              {clauses.map((clause, idx) => {
                const isInserted = insertedIndices.includes(idx);
                const isEditing = editingIndex === idx;

                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5">Clause Title (English)</label>
                              <input
                                type="text"
                                value={clause.titleEn}
                                onChange={e => {
                                  const val = e.target.value;
                                  setClauses(prev => prev.map((c, i) => (i === idx ? { ...c, titleEn: val } : c)));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-0.5 text-right">عنوان البند (العربية)</label>
                              <input
                                type="text"
                                dir="rtl"
                                value={clause.titleAr}
                                onChange={e => {
                                  const val = e.target.value;
                                  setClauses(prev => prev.map((c, i) => (i === idx ? { ...c, titleAr: val } : c)));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-arabic text-right"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-xs font-bold text-amber-300">{clause.titleEn}</div>
                            <div className="text-xs font-semibold text-slate-300 font-arabic mt-0.5" dir="rtl">
                              {clause.titleAr}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(isEditing ? null : idx)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[11px] ${
                            isEditing
                              ? 'bg-[#C9A05C]/20 border-[#C9A05C] text-amber-300'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                          }`}
                          title={isEditing ? 'Finish editing' : 'Edit clause text'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditing ? 'Done' : 'Edit'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyClause(clause, idx)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
                          title="Copy text"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertSingle(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            isInserted
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 shadow'
                          }`}
                        >
                          {isInserted ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Inserted</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Insert Clause</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Bilingual Parallel Preview / Editor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-900 text-xs">
                      {isEditing ? (
                        <>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
                              Edit English Clause
                            </span>
                            <textarea
                              rows={4}
                              value={clause.clauseEn}
                              onChange={e => {
                                const val = e.target.value;
                                setClauses(prev => prev.map((c, i) => (i === idx ? { ...c, clauseEn: val } : c)));
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white leading-relaxed"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 text-right">
                              تعديل البند بالعربية
                            </span>
                            <textarea
                              rows={4}
                              dir="rtl"
                              value={clause.clauseAr}
                              onChange={e => {
                                const val = e.target.value;
                                setClauses(prev => prev.map((c, i) => (i === idx ? { ...c, clauseAr: val } : c)));
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white font-arabic leading-relaxed text-right"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-slate-300 leading-relaxed text-[11px]">
                            <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                              English Text
                            </span>
                            {clause.clauseEn}
                          </div>

                          <div
                            className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-slate-300 leading-relaxed text-[11px] font-arabic text-right"
                            dir="rtl"
                          >
                            <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1" dir="ltr">
                              النص بالعربية
                            </span>
                            {clause.clauseAr}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <p className="text-[11px] text-slate-500">
            * Suggestion only: you always maintain 100% free-text editing control after inserting.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
            >
              Close
            </button>
            {clauses.length > 0 && (
              <button
                type="button"
                onClick={handleInsertAll}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-lg font-bold shadow flex items-center gap-1.5 cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Insert All ({clauses.length}) Clauses</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
